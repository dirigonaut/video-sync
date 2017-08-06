const Promise = require('bluebird');

var publisher, redisSocket, smtp, userAdmin, schemaFactory, sanitizer, authenticator,
      session, chatEngine, playerManager, eventKeys, log;

function AuthenticationController() { }

AuthenticationController.prototype.initialize = function(force) {
  if(typeof AuthenticationController.prototype.protoInit === 'undefined') {
    AuthenticationController.prototype.protoInit = true;
    userAdmin       = this.factory.createUserAdministration();
    schemaFactory		= this.factory.createSchemaFactory();
    sanitizer		    = this.factory.createSanitizer();
    chatEngine      = this.factory.createChatEngine();
    eventKeys       = this.factory.createKeys();

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

    socket.on(eventKeys.GETTOKEN, Promise.coroutine(function* (data) {
      log.debug(eventKeys.GETTOKEN);
      console.log(data)
      var schema = schemaFactory.createDefinition(schemaFactory.Enum.LOGIN);
      var request = sanitizer.sanitize(data, schema, [schema.Enum.ADDRESS]);

      if(request) {
        var activeSession = yield session.getSession();

        if(activeSession) {
          var token = yield authenticator.requestToken(socket.id, request);

          if(token) {
            smtp.initializeTransport(activeSession.smtp);
            var mailOptions = smtp.createMailOptions(activeSession.smtp, token.address, "Video-Sync Token", "Session token: " + token.pass, "");

            smtp.sendMail(mailOptions);
            socket.emit(eventKeys.SENTTOKEN);
          }
        }
      }
    }));

    socket.on(eventKeys.AUTHTOKEN, Promise.coroutine(function* (data) {
      log.debug(eventKeys.AUTHTOKEN);
      var schema = schemaFactory.createDefinition(schemaFactory.Enum.LOGIN);
      var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

      if(request) {
        var authorized = yield authenticator.validateToken(socket.id, request);
        if(authorized) {
          yield userAuthorized.call(this, socket, request.handle);
        } else {
          socket.logonAttempts += 1;

          if(socket.logonAttempts > 4) {
            yield userAdmin.disconnectSocket(socket);
          }
        }
      }
    }.bind(this)));

    socket.on(eventKeys.DISCONNECT, Promise.coroutine(function*() {
      log.info(eventKeys.DISCONNECT, socket.id);
      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, 'has left the session..']);
      yield chatEngine.broadcast(chatEngine.Enum.EVENT, response);

      var isAdmin = yield session.isAdmin(socket.id);
      if(isAdmin) {
        session.removeAdmin(socket.id);
      }

      yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.REMOVEPLAYER, [socket.id]]);
      yield userAdmin.disconnectSocket(socket);
    }));

    setTimeout(Promise.coroutine(function* () {
      //If the socket didn't authenticate, disconnect it
      if (!socket.auth) {
        log.debug(socket.auth);
        log.info("timing out socket", socket.id);
        yield userAdmin.disconnectSocket(socket);
      }
    }.bind(this)), 300000);

    socket.emit(eventKeys.CONNECTED);
  }.bind(this)));
};

module.exports = AuthenticationController;

var userAuthorized = Promise.coroutine(function* (socket, handle, isAdmin) {
  socket.auth = true;

  yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.CREATEPLAYER, [socket.id, handle]]);

  var videoController = this.factory.createVideoController();
  var stateController = this.factory.createStateController();
  var chatController  = this.factory.createChatController();

  videoController.attachSocket(socket);
  stateController.attachSocket(socket);
  chatController.attachSocket(socket);

  var chatEngine = this.factory.createChatEngine();

  socket.emit(eventKeys.AUTHENTICATED, isAdmin, Promise.coroutine(function* () {
    var mediaPath = yield session.getMediaPath();
    if(mediaPath && mediaPath.length > 0) {
      socket.emit(eventKeys.MEDIAREADY);
    }

    var handles = yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.GETHANDLES, []]);
    yield redisSocket.broadcast(eventKeys.HANDLES, handles);

    var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, 'has joined.']);
    yield chatEngine.broadcast(chatEngine.Enum.EVENT, response);
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
    userAuthorized.call(this, socket, 'admin', true);
  }
});
