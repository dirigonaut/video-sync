var Smtp          = require('../administration/Smtp');
var Bundler       = require('../utils/Bundler');
var Session       = require('../administration/Session');
var LogManager    = require('../log/LogManager');
var UserAdmin     = require('../administration/UserAdministration');
var Validator     = require('../authentication/Validator');
var NeDatabase    = require('../database/NeDatabase');
var PlayerManager = require('../player/PlayerManager.js');
var Authenticator = require('../authentication/Authenticator');
var ChatEngine    = require('../chat/ChatEngine');

var AdminController     = require('../administration/AdminController');
var VideoController     = require('../video/VideoController');
var StateController     = require('../state/StateController');
var DatabaseController  = require('../database/DatabaseController');
var ChatController      = require('../chat/ChatController');

var log = LogManager.getLog(LogManager.LogEnum.AUTHENTICATION);

var smtp;
var session;
var userAdmin;
var validator;
var authenticator;

function AuthenticationController(io) {
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
    log.info("socket has connected: " + socket.id + " ip:" + socket.handshake.address);
    socket.logonAttempts = 0;

    isAdministrator(socket, io);
    socket.emit('connected');

    socket.on('auth-get-token', function (data) {
    log.debug('auth-get-token');

      var requestSmtp = function(token) {
        var sendInvitations = function(hostAddress) {
          var mailOptions = smtp.createMailOptions(session.getActiveSession().smtp, token.address, "Video-Sync Token", "Session token: " + token.token, "");
          smtp.sendMail(mailOptions);
          socket.emit('login-token-sent');
        };

        smtp.initializeTransport(session.getActiveSession().smtp, sendInvitations);
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

      var manager = new PlayerManager();
      manager.removePlayer(socket.id);
      userAdmin.disconnectSocket(socket);
    });

    socket.on('error', function (data) {
      log.error(data);
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

  var manager = new PlayerManager();
  manager.createPlayer(socket, handle);

  var video = new VideoController(io, socket);
  var state = new StateController(io, socket);
  var chat = new ChatController(io, socket);

  var chatEngine = new ChatEngine();

  socket.emit('authenticated', function() {
    if(session.getMediaPath() !== null && session.getMediaPath().length > 0) {
      socket.emit('media-ready');
    }

    io.emit('chat-handles', manager.getHandles());
    chatEngine.broadcast(ChatEngine.Enum.EVENT, chatEngine.buildMessage(socket.id, ` has joined the session.`));
  });

  log.info("socket has been authenticated.", socket.id);
}

function isAdministrator(socket, io) {
  socket.auth = false;

  if(session.getAdmin() == null) {
    if(socket.handshake.address == "::ffff:127.0.0.1") {
      new AdminController(io, socket);
      new DatabaseController(io, socket);

      userAuthorized(socket, io, 'admin');
      session.setAdminId(socket.id);
    }
  }
}
