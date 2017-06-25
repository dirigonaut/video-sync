const Promise       = require('bluebird');

var publisher, redisSocket, smtp, userAdmin, validator, authenticator, socketLog

function AuthenticationController() { }

AuthenticationController.prototype.initialize = function(io) {
  if(typeof AuthenticationController.prototype.lazyInit === 'undefined') {
    publisher       = yield this.factory.createRedisPublisher();
    redisSocket     = yield this.factory.createRedisSocket()
    smtp            = yield this.factory.createSmtp();
    userAdmin       = yield this.factory.createUserAdministration();
    validator		    = yield this.factory.createValidator();
    authenticator   = yield this.factory.createAuthenticator();
    socketLog       = yield this.factory.createSocketLog();
    AuthenticationController.prototype.lazyInit = true;
  }

  initialize.call(this, io);
}
module.exports = AuthenticationController;

function initialize(io) {
  io.on('connection', Promise.coroutine(function* (socket) {
    console.log(socket.handshake.address.toString());
    this.log.info("socket has connected: " + socket.id + " ip: " + socket.handshake.address);
    socket.logonAttempts = 0;

    yield isAdministrator.call(this, socket, io);

    socket.on('auth-get-token', Promise.coroutine(function* (data) {
      this.log.debug('auth-get-token');
      var requestSmtp = Promise.coroutine(function* (token) {
        var activeSession = yield this.session.getSession();

        var sendInvitations = function(hostAddress) {
          var mailOptions = smtp.createMailOptions(activeSession.smtp, token.address, "Video-Sync Token", "Session token: " + token.pass, "");
          smtp.sendMail(mailOptions);
          socket.emit('login-token-sent');
        };

        smtp.initializeTransport(activeSession.smtp, sendInvitations);

        socketLog.log("Login Info: ", token);
      });

      authenticator.requestToken(socket.id, validator.sterilizeUser(data), requestSmtp);
    }.bind(this)));

    socket.on('auth-validate-token', Promise.coroutine(function* (data) {
      this.log.debug('auth-validate-token');
      var cleanData = validator.sterilizeUser(data);

      var loginAttempt = Promise.coroutine(function* (authorized) {
        if(authorized) {
          userAuthorized.call(this, socket, io, cleanData.handle);
        } else {
          socket.logonAttempts += 1;

          if(socket.logonAttempts > 4) {
            yield userAdmin.disconnectSocket(socket);
          }
        }
      });

      authenticator.validateToken(socket.id, cleanData, loginAttempt);
    }.bind(this)));

    socket.on('disconnect', Promise.coroutine(function* () {
      this.log.info('disconnect', socket.id);
      var chatEngine = yield this.factory.createChatEngine();
      chatEngine.initialize();
      chatEngine.broadcast(ChatEngine.Enum.EVENT, chatEngine.buildMessage(socket.id, ` has left the session.`));

      var isAdmin = yield this.session.isAdmin(socket.id);
      if(isAdmin) {
        this.session.removeAdmin(socket.id);
      }

      yield publisher.publishAsync(Publisher.Enum.PLAYER, ['removePlayer', [socket.id]]);
      yield userAdmin.disconnectSocket(socket);
    }.bind(this)));

    socket.on('error', function (data) {
      this.log.error("error", data);
    }.bind(this));

    setTimeout(Promise.coroutine(function* () {
      //If the socket didn't authenticate, disconnect it
      if (!socket.auth) {
        this.log.debug(socket.auth);
        this.log.info("timing out socket", socket.id);
        yield userAdmin.disconnectSocket(socket);
      }
    }.bind(this)), 300000);

    socket.emit('connected');
  }.bind(this)));
}

var userAuthorized = Promise.coroutine(function* (socket, io, handle) {
  socket.auth = true;

  yield publisher.publishAsync(Publisher.Enum.PLAYER, ['createPlayer', [socket.id, handle]]);

  var videoController = yield this.factory.createVideoController();
  var stateController = yield this.factory.createStateController();
  var chatController = yield this.factory.createChatController();

  videoController.initialize(io, socket);
  stateController.initialize(io, socket);
  chatController.initialize(io, socket);

  var chatEngine = yield this.factory.createChatEngine();
  chatEngine.initialize();

  socket.emit('authenticated', Promise.coroutine(function* () {
    var mediaPath = yield this.session.getMediaPath();
    if(mediaPath && mediaPath.length > 0) {
      socket.emit('media-ready');
    }

    var handles = yield publisher.publishAsync(Publisher.Enum.PLAYER, ['getHandles', []]);
    redisSocket.broadcast('chat-handles', handles);
    chatEngine.broadcast(ChatEngine.Enum.EVENT, chatEngine.buildMessage(socket.id, ` has joined the session.`));
  }.bind(this)));

  this.log.info("socket has been authenticated.", socket.id);
});

var isAdministrator = Promise.coroutine(function* (socket, io) {
  socket.auth = false;

  var admin = yield this.session.getAdmin();
  this.log.info(`Admin is ${admin} new socket is ${socket.id}`);
  if(socket.handshake.address.includes("127.0.0.1")) {
    var adminController = yield this.factory.createAdministrationController();
    var databaseContoller = yield this.factory.createDatabaseController();

    adminController.initialize(io, socket);
    databaseContoller.initialize(io, socket);

    yield this.session.addAdmin(socket.id);
    userAuthorized.call(this, socket, io, 'admin');
  }
});
