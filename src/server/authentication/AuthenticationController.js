var Smtp          = require('../administration/Smtp');
var Bundler       = require('../utils/Bundler');
var Session       = require('../administration/Session');
var LogManager    = require('../log/LogManager');
var UserAdmin     = require('../administration/UserAdministration');
var Validator     = require('../authentication/Validator');
var Authenticator = require('../authentication/Authenticator');
var ChatEngine    = require('../chat/ChatEngine');
var Publisher     = require('../process/redis/RedisPublisher');
var RedisSocket   = require('../process/redis/RedisSocket');
var SocketLog     = require('../log/SocketLog');

var AdminController     = require('../administration/AdminController');
var VideoController     = require('../video/VideoController');
var StateController     = require('../state/StateController');
var DatabaseController  = require('../database/DatabaseController');
var ChatController      = require('../chat/ChatController');

var log       = LogManager.getLog(LogManager.LogEnum.AUTHENTICATION);
var socketLog = new SocketLog();

var publisher;
var redisSocket;
var smtp;
var session;
var userAdmin;
var validator;
var authenticator;

function AuthenticationController(io) {
  publisher       = new Publisher();
  redisSocket     = new RedisSocket()
  smtp            = new Smtp();
  session         = new Session();
  userAdmin       = new UserAdmin();
  validator		    = new Validator();
  authenticator   = new Authenticator();

  initialize(io);
}

module.exports = AuthenticationController;

function initialize(io) {
  io.on('connection', function (socket) {
    console.log(socket.handshake.address.toString());
    log.info("socket has connected: " + socket.id + " ip: " + socket.handshake.address);
    socket.logonAttempts = 0;

    isAdministrator(socket, io);
    socket.emit('connected');

    socket.on('auth-get-token', function (data) {
      log.debug('auth-get-token');
      var requestSmtp = function(token) {
        var getSmtp = function(session) {
          var sendInvitations = function(hostAddress) {
            var mailOptions = smtp.createMailOptions(session.smtp, token.address, "Video-Sync Token", "Session token: " + token.pass, "");
            smtp.sendMail(mailOptions);
            socket.emit('login-token-sent');
          };

          smtp.initializeTransport(session.smtp, sendInvitations);
        };

        socketLog.log("Login Info: ", token);
        session.getSession(getSmtp);
      };

      authenticator.requestToken(socket.id, validator.sterilizeUser(data), requestSmtp);
    });

    socket.on('auth-validate-token', function (data) {
      log.debug('auth-validate-token');
      var cleanData = validator.sterilizeUser(data);

      var loginAttempt = function(authorized) {
        if(authorized) {
          userAuthorized(socket, io, cleanData.handle);
        } else {
          socket.logonAttempts += 1;

          if(socket.logonAttempts > 4) {
            userAdmin.disconnectSocket(socket);
          }
        }
      };

      authenticator.validateToken(socket.id, cleanData, loginAttempt);
    });

    socket.on('disconnect', function() {
      log.info('disconnect', socket.id);
      var chatEngine = new ChatEngine();
      chatEngine.broadcast(ChatEngine.Enum.EVENT, chatEngine.buildMessage(socket.id, ` has left the session.`));

      var removeAdmin = function(isAdmin) {
        if(isAdmin) {
          session.removeAdmin(socket.id);
        }
      };

      session.isAdmin(socket.id, removeAdmin);

      var disconnect = function(socket) {
        userAdmin.disconnectSocket(socket);
      }

      publisher.publish(Publisher.Enum.PLAYER, ['removePlayer', [socket.id]], disconnect);
    });

    socket.on('error', function (data) {
      log.error("error", data);
    });

    setTimeout(function(){
      //If the socket didn't authenticate, disconnect it
      if (!socket.auth) {
        log.debug(socket.auth);
        log.info("timing out socket", socket.id);
        userAdmin.disconnectSocket(socket);
      }
    }, 300000);
  });
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

function isAdministrator(socket, io) {
  socket.auth = false;

  var setAdminId = function(admin) {
    log.info(`Admin is ${admin} new socket is ${socket.id}`);
    if(socket.handshake.address.includes("127.0.0.1")) {
      new AdminController(io, socket);
      new DatabaseController(io, socket);

      session.addAdmin(socket.id);
      userAuthorized(socket, io, 'admin');
    }
  };

  session.getAdmin(setAdminId);
}
