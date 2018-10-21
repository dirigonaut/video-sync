const Promise = require('bluebird');

var publisher, schemaFactory, sanitizer, credentials,
      redisSocket, playerManager, media, eventKeys, log;

function AuthenticationController() { }

AuthenticationController.prototype.initialize = function() {
  if(typeof AuthenticationController.prototype.protoInit === 'undefined') {
    AuthenticationController.prototype.protoInit = true;
    credentials     = this.factory.createCredentialManager();
    publisher       = this.factory.createRedisPublisher();
    redisSocket     = this.factory.createRedisSocket();

    schemaFactory		= this.factory.createSchemaFactory();
    sanitizer		    = this.factory.createSanitizer();
    eventKeys       = this.factory.createKeys();

    playerManager   = this.factory.getPlayerManagerInfo();
    media           = this.factory.createMedia();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.AUTHENTICATION);
  }
};

AuthenticationController.prototype.attachIO = function (io) {
  io.use(Promise.coroutine(function* (socket, next) {
    var token = decodeURIComponent(socket.handshake.query.token);

    try {
      if(token !== 'undefined') {
        token = JSON.parse(token);
      }
    } catch(error) {
      log.warn(error);
      token = undefined;
    }

    var schema  = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.PAIR);
    var request = sanitizer.sanitize(token, schema, Object.values(schema.Enum));

    if(!(request instanceof Error)) {
      var isAdmin = yield isAdministrator.call(this, socket, request);
      var isUser;

      if(!isAdmin) {
        isUser = yield isValidUser.call(this, socket, request);
      }
    }

    var error;
    if(request instanceof Error) {
      error = request.toString();
    } else if(!isAdmin && !isUser) {
      error = "Submitted token is not valid or is already in use.";
    }

    return isAdmin || isUser ? next(log.info(`${socket.id} has been authenticated.`))
                    : next(new Error(`${JSON.stringify(token)} has failed authentication with error: ${error}`));
  }.bind(this)));

  io.on('connection', Promise.coroutine(function* (socket, data) {
    log.socket(`Socket has connected: ${socket.id} ip: ${socket.handshake.address}`);
    var admin = yield credentials.getAdmin(socket);
    let isAdmin = admin.id === socket.id;

    socket.emit(eventKeys.AUTHENTICATED, isAdmin, Promise.coroutine(function* () {
      log.info(`Socket: ${socket.id} has acknowledged the handshake.`);
      yield publisher.publishAsync(publisher.Enums.KEY.PLAYER, [playerManager.Functions.CREATEPLAYER, [socket.id]]);

      var mediaPath = yield media.getMediaPath();
      if(mediaPath && mediaPath.length > 0) {
        socket.emit(eventKeys.MEDIAREADY);
      }

      var handle = yield credentials.getHandle(socket);
      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.LOGRESPONSE,
        [new Date().toLocaleTimeString(), 'notify', 'auth', `${handle} joined.`]);
      yield redisSocket.broadcast.call(AuthenticationController.prototype, eventKeys.NOTIFICATION, response);
    }));

    socket.on(eventKeys.DISCONNECT, Promise.coroutine(function* () {
      log.info(eventKeys.DISCONNECT, socket.id);

      if(socket && socket.id) {
        var admin = yield credentials.getAdmin();
        var includes = yield credentials.includes(socket.id);
        var handle = yield credentials.getHandle(socket);
        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.LOGRESPONSE,
          [new Date().toLocaleTimeString(), 'notify', 'auth', `${handle} left.`]);

        if(admin && admin.id === socket.id) {
          credentials.removeAdmin(socket);
          redisSocket.broadcast.call(AuthenticationController.prototype, eventKeys.NOTIFICATION, response);
        } else if(includes) {
          var tokens = yield credentials.resetToken(socket.id);
          var tokenResp = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.RESPONSE, [tokens]);

          redisSocket.broadcast.call(AuthenticationController.prototype, eventKeys.NOTIFICATION, response);

          if(admin && admin.id) {
            redisSocket.ping.call(this, admin.id, eventKeys.TOKENS, tokenResp);
          }
        }

        yield publisher.publishAsync(publisher.Enums.KEY.PLAYER, [playerManager.Functions.REMOVEPLAYER, [socket.id]]);
      }
    }));

    if(isAdmin) {
      socket.on(eventKeys.SHUTDOWN, function() {
        log.info(eventKeys.SHUTDOWN, socket.id);
        socket.emit(eventKeys.CONFIRM, "Are you sure you wish to shutdown the Video-Sync server?", function(confirm) {
          if(confirm === true) {
            log.info(eventKeys.SHUTDOWN, 'The shutdown command has been received and confirmed.');
            process.send('master-process:shutdown');
          }
        });
      });
    }
  }));
};

module.exports = AuthenticationController;

var isAdministrator = Promise.coroutine(function* (socket, request) {
  var admin = yield credentials.getAdmin();

  if(!admin) {
    var isAdmin = credentials.isAdmin(socket, request ? request.id : undefined);

    if(isAdmin) {
      yield credentials.setAdmin(socket, request);

      var adminController       = this.factory.createAdminController();
      var credentialController  = this.factory.createCredentialController();

      adminController.attachSocket(socket);
      credentialController.attachSocket(socket);

      userAuthorized.call(this, socket);
    }
  }

  return isAdmin;
});

var isValidUser = Promise.coroutine(function* (socket, request) {
  var isAuth = yield credentials.authenticateToken(socket.id, request.id, request.data);

  if(isAuth) {
    userAuthorized.call(this, socket);
  }

  return isAuth;
});

var userAuthorized = function(socket) {
  var videoController = this.factory.createVideoController();
  var stateController = this.factory.createStateController();

  videoController.attachSocket(socket);
  stateController.attachSocket(socket);
};
