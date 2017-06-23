const Promise       = require('bluebird');
const Smtp          = require('../administration/Smtp');
const Bundler       = require('../utils/Bundler');
const Session       = require('../administration/Session');
const LogManager    = require('../log/LogManager');
const UserAdmin     = require('../administration/UserAdministration');
const Validator     = require('../authentication/Validator');
const Authenticator = require('../authentication/Authenticator');
const ChatEngine    = require('../chat/ChatEngine');
const Publisher     = require('../process/redis/RedisPublisher');
const RedisSocket   = require('../process/redis/RedisSocket');
const SocketLog     = require('../log/SocketLog');

const AdminController     = require('../administration/AdminController');
const VideoController     = require('../video/VideoController');
const StateController     = require('../state/StateController');
const DatabaseController  = require('../database/DatabaseController');
const ChatController      = require('../chat/ChatController');

var log       = LogManager.getLog(LogManager.LogEnum.AUTHENTICATION);
var publisher, redisSocket, smtp, session, userAdmin, validator, authenticator, socketLog

function lazyInit() {
  publisher       = new Publisher();
  redisSocket     = new RedisSocket()
  smtp            = new Smtp();
  session         = new Session();
  userAdmin       = new UserAdmin();
  validator		    = new Validator();
  authenticator   = new Authenticator();
  socketLog       = new SocketLog();
}

class AuthenticationController {
  constructor(io, socket) {
    if(typeof AuthenticationController.prototype.lazyInit === 'undefined') {
      lazyInit();
      AuthenticationController.prototype.lazyInit = true;
    }

    initialize(io, socket);
  }
}

module.exports = AuthenticationController;

function initialize(io) {
  io.on('connection', Promise.coroutine(function* (socket) {
    console.log(socket.handshake.address.toString());
    log.info("socket has connected: " + socket.id + " ip: " + socket.handshake.address);
    socket.logonAttempts = 0;

    yield isAdministrator(socket, io);
    socket.emit('connected');

    socket.on('auth-get-token', Promise.coroutine(function* (data) {
      log.debug('auth-get-token');
      var requestSmtp = Promise.coroutine(function* (token) {
        var activeSession = yield session.getSession();

        var sendInvitations = function(hostAddress) {
          var mailOptions = smtp.createMailOptions(activeSession.smtp, token.address, "Video-Sync Token", "Session token: " + token.pass, "");
          smtp.sendMail(mailOptions);
          socket.emit('login-token-sent');
        };

        smtp.initializeTransport(activeSession.smtp, sendInvitations);

        socketLog.log("Login Info: ", token);
      });

      authenticator.requestToken(socket.id, validator.sterilizeUser(data), requestSmtp);
    }));

    socket.on('auth-validate-token', Promise.coroutine(function* (data) {
      log.debug('auth-validate-token');
      var cleanData = validator.sterilizeUser(data);

      var loginAttempt = Promise.coroutine(function* (authorized) {
        if(authorized) {
          userAuthorized(socket, io, cleanData.handle);
        } else {
          socket.logonAttempts += 1;

          if(socket.logonAttempts > 4) {
            yield userAdmin.disconnectSocket(socket);
          }
        }
      });

      authenticator.validateToken(socket.id, cleanData, loginAttempt);
    }));

    socket.on('disconnect', Promise.coroutine(function* () {
      log.info('disconnect', socket.id);
      var chatEngine = new ChatEngine();
      chatEngine.broadcast(ChatEngine.Enum.EVENT, chatEngine.buildMessage(socket.id, ` has left the session.`));

      var isAdmin = yield session.isAdmin(socket.id);
      if(isAdmin) {
        session.removeAdmin(socket.id);
      }

      var disconnect =  Promise.coroutine(function* (socket) {
        yield userAdmin.disconnectSocket(socket);
      });

      publisher.publish(Publisher.Enum.PLAYER, ['removePlayer', [socket.id]], disconnect);
    }));

    socket.on('error', function (data) {
      log.error("error", data);
    });

    setTimeout(Promise.coroutine(function* () {
      //If the socket didn't authenticate, disconnect it
      if (!socket.auth) {
        log.debug(socket.auth);
        log.info("timing out socket", socket.id);
        yield userAdmin.disconnectSocket(socket);
      }
    }), 300000);
  }));
}

function userAuthorized(socket, io, handle) {
  socket.auth = true;

  publisher.publish(Publisher.Enum.PLAYER, ['createPlayer', [socket.id, handle]]);

  var video = new VideoController(io, socket);
  var state = new StateController(io, socket);
  var chat = new ChatController(io, socket);

  var chatEngine = new ChatEngine();

  socket.emit('authenticated', function() {
    var emitMediaReady = function(mediaPath) {
      if(mediaPath !== null && mediaPath !== undefined && mediaPath.length > 0) {
        socket.emit('media-ready');
      }
    };

    session.getMediaPath(emitMediaReady);

    var emitHandles = function(handles) {
      redisSocket.broadcast('chat-handles', handles);
      chatEngine.broadcast(ChatEngine.Enum.EVENT, chatEngine.buildMessage(socket.id, ` has joined the session.`));
    }

    publisher.publish(Publisher.Enum.PLAYER, ['getHandles', []], emitHandles);
  });

  log.info("socket has been authenticated.", socket.id);
}

var isAdministrator = Promise.coroutine(function* (socket, io) {
  socket.auth = false;

  var admin = yield session.getAdmin();
  log.info(`Admin is ${admin} new socket is ${socket.id}`);
  if(socket.handshake.address.includes("127.0.0.1")) {
    new AdminController(io, socket);
    new DatabaseController(io, socket);

    yield session.addAdmin(socket.id);
    userAuthorized(socket, io, 'admin');
  }
});
