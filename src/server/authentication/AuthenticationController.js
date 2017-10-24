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

    var isAdmin = yield isAdministrator.call(this, socket);
    var isUser;

    if(!isAdmin) {
      isUser = yield isValidUser.call(this, socket, token);
    }

    return isAdmin || isUser ? next(log.info(`${socket.id} has been authenticated.`, socket.id))
                    : next(new Error(`${JSON.stringify(token)} has failed authentication.`));
  }.bind(this)));

  io.on('connection', Promise.coroutine(function* (socket, data) {
    log.socket(`Socket has connected: ${socket.id} ip: ${socket.handshake.address}`);
    let isAdmin = yield credentials.isAdmin(socket);

    socket.emit(eventKeys.AUTHENTICATED, isAdmin, Promise.coroutine(function* () {
      log.info(`Socket: ${socket.id} has acknowledged the handshake.`);
      yield publisher.publishAsync(publisher.Enums.KEY.PLAYER, [playerManager.Functions.CREATEPLAYER, [socket.id]]);

      var mediaPath = yield media.getMediaPath();
      if(mediaPath && mediaPath.length > 0) {
        socket.emit(eventKeys.MEDIAREADY);
      }
    }));

    socket.on(eventKeys.DISCONNECT, Promise.coroutine(function* () {
      log.info(eventKeys.DISCONNECT, socket.id);

      if(socket && socket.id) {
        var adminId = yield credentials.getAdmin();
        var includes = yield credentials.includes(socket.id);

        if(adminId === socket.id) {
          credentials.removeAdmin(socket);
        } else if(includes) {
          var tokens = yield credentials.resetToken(socket.id);

          if(adminId) {
            redisSocket.ping.call(this, adminId, eventKeys.TOKENS, tokens);
          }
        }

        yield publisher.publishAsync(publisher.Enums.KEY.PLAYER, [playerManager.Functions.REMOVEPLAYER, [socket.id]]);
      }
    }));

    if(isAdmin) {
      socket.on(eventKeys.SHUTDOWN, function() {
        log.info(eventKeys.SHUTDOWN, socket.id);
        socket.emit(eventKeys.CONFIRM, function(confirmed) {
          if(confirmed) {
            log.info(eventKeys.SHUTDOWN, 'The shutdown command has been received and confirmed.');
            process.send('master-process:shutdown');
          }
        });
      });
    }
  }));
};

module.exports = AuthenticationController;

var isAdministrator = Promise.coroutine(function* (socket) {
  var isAdmin = yield credentials.isAdmin(socket);

  if(isAdmin) {
    var adminController       = this.factory.createAdminController();
    var credentialController  = this.factory.createCredentialController();
    var encodingContoller     = this.factory.createEncodingController();

    adminController.attachSocket(socket);
    credentialController.attachSocket(socket);
    encodingContoller.attachSocket(socket);

    userAuthorized.call(this, socket);
  }

  return isAdmin;
});

var isValidUser = Promise.coroutine(function* (socket, data) {
  var schema  = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.PAIR);
  var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

  if(request) {
    var isAuth = yield credentials.authenticateToken(socket.id, request.id, request.data);

    if(isAuth) {
      userAuthorized.call(this, socket);
    }
    return isAuth;
  }
});

var userAuthorized = function(socket) {
  var videoController = this.factory.createVideoController();
  var stateController = this.factory.createStateController();

  videoController.attachSocket(socket);
  stateController.attachSocket(socket);
};
