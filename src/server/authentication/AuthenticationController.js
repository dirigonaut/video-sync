const Promise = require('bluebird');

var publisher, redisSocket, smtp, userAdmin, schemaFactory, authenticator,
      session, chatEngine, playerManager, log;

function AuthenticationController() { }

AuthenticationController.prototype.initialize = function(force) {
  if(typeof AuthenticationController.prototype.protoInit === 'undefined') {
    AuthenticationController.prototype.protoInit = true;
    userAdmin       = this.factory.createUserAdministration();
    schemaFactory		    = this.factory.createSchemaFactory();
    chatEngine      = this.factory.createChatEngine();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.AUTHENTICATION);
  }

  if(force === undefined ? typeof AuthenticationController.prototype.stateInit === 'undefined' : force) {
    AuthenticationController.prototype.stateInit = true;
    session         = this.factory.createSession();
    authenticator   = this.factory.createAuthenticator();
    publisher       = this.factory.createRedisPublisher();
    redisSocket     = this.factory.createRedisSocket();
    smtp            = this.factory.createSmtp();
    playerManager   = this.factory.createPlayerManager(false);
  }
};

AuthenticationController.prototype.attachIO = function (io) {
  io.on('connection', Promise.coroutine(function*(socket) {
    log.socket(`socket has connected: ${socket.id} ip: ${socket.handshake.address}`);
    socket.logonAttempts = 0;

    yield isAdministrator.call(this, socket);

    socket.on('auth-get-token', Promise.coroutine(function* (data) {
      log.debug('auth-get-token');
      var requestSmtp = Promise.coroutine(function* (token) {
        var activeSession = yield session.getSession();

        smtp.initializeTransport(activeSession.smtp);
        var mailOptions = smtp.createMailOptions(activeSession.smtp, token.address, "Video-Sync Token", "Session token: " + token.pass, "");

        smtp.sendMail(mailOptions);
        socket.emit('login-token-sent');
      });

      authenticator.requestToken(socket.id, data, requestSmtp);
    }));

    socket.on('auth-validate-token', Promise.coroutine(function*(data) {
      log.debug('auth-validate-token');
      var cleanData = data;

      var authorized = yield authenticator.validateToken(socket.id, cleanData);
      if(authorized) {
        yield userAuthorized.call(this, socket, cleanData.handle);
      } else {
        socket.logonAttempts += 1;

        if(socket.logonAttempts > 4) {
          yield userAdmin.disconnectSocket(socket);
        }
      }
    }.bind(this)));

    socket.on('disconnect', Promise.coroutine(function*() {
      log.info('disconnect', socket.id);
      yield chatEngine.broadcast(chatEngine.Enum.EVENT, chatEngine.buildMessage(socket.id, ` has left the session.`));

      var isAdmin = yield session.isAdmin(socket.id);
      if(isAdmin) {
        session.removeAdmin(socket.id);
      }

      yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.REMOVEPLAYER, [socket.id]]);
      yield userAdmin.disconnectSocket(socket);
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
    }.bind(this)), 300000);

    socket.emit('connected');
  }.bind(this)));
};

module.exports = AuthenticationController;

var userAuthorized = Promise.coroutine(function* (socket, handle) {
  socket.auth = true;

  yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.CREATEPLAYER, [socket.id, handle]]);

  var videoController = this.factory.createVideoController();
  var stateController = this.factory.createStateController();
  var chatController  = this.factory.createChatController();

  videoController.attachSocket(socket);
  stateController.attachSocket(socket);
  chatController.attachSocket(socket);

  var chatEngine = this.factory.createChatEngine();

  socket.emit('authenticated', Promise.coroutine(function* () {
    var mediaPath = yield session.getMediaPath();
    if(mediaPath && mediaPath.length > 0) {
      socket.emit('media-ready');
    }

    var handles = yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.GETHANDLES, []]);
    yield redisSocket.broadcast('chat-handles', handles);
    yield chatEngine.broadcast(chatEngine.Enum.EVENT, chatEngine.buildMessage(socket.id, ` has joined the session.`));
  }));

  log.info("socket has been authenticated.", socket.id);
});

var isAdministrator = Promise.coroutine(function* (socket) {
  socket.auth = false;

  var admin = yield session.getAdmin();
  log.info(`Admin is ${admin} new socket is ${socket.id}`);
  if(socket.handshake.address.includes("127.0.0.1")) {
    var adminController   = this.factory.createAdminController();
    var databaseContoller = this.factory.createDatabaseController();
    var encodingContoller = this.factory.createEncodingController();

    adminController.attachSocket(socket);
    databaseContoller.attachSocket(socket);
    encodingContoller.attachSocket(socket);

    yield session.addAdmin(socket.id);
    userAuthorized.call(this, socket, 'admin');
  }
});
