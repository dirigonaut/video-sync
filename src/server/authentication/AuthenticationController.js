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
    let token = socket.handshake.query.token;
    let isValid;

    if(token && token !== 'undefined') {
      isValid = yield isUser.call(this, socket, token);
    } else {
      isValid = isAdministrator.call(this, socket);
    }

    return isValid ? next(log.info(`${socket.id} has been authenticated.`, socket.id))
                    : next(log.error(`${socket.id} has failed authentication.`));
  }.bind(this)));

  io.on('connection', Promise.coroutine(function* (socket, data) {
    log.socket(`Socket has connected: ${socket.id} ip: ${socket.handshake.address}`);

    socket.emit(eventKeys.AUTHENTICATED, credentials.isAdmin(socket), Promise.coroutine(function* () {
      yield publisher.publishAsync(publisher.Enums.KEY.PLAYER, [playerManager.Functions.CREATEPLAYER, [socket.id]]);

      var mediaPath = yield media.getMediaPath();
      if(mediaPath && mediaPath.length > 0) {
        socket.emit(eventKeys.MEDIAREADY);
      }
    }));

    socket.on(eventKeys.DISCONNECT, Promise.coroutine(function*() {
      log.info(eventKeys.DISCONNECT, socket.id);

      if(socket && socket.id && socket.auth) {
        var adminId = yield credentials.getAdmin();

        if(adminId) {
          credentials.removeAdmin(socket.id);
        } else {
          redisSocket.ping.call(this, adminId, eventKeys.TOKENS, credentials.resetToken(socket.id));
        }

        yield publisher.publishAsync(publisher.Enums.KEY.PLAYER, [playerManager.Functions.REMOVEPLAYER, [socket.id]]);
      }
    }));

    if(credentials.isAdmin(socket)) {
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

var isAdministrator = function(socket) {
  var isAuth;

  if(credentials.isAdmin(socket)) {
    var adminController       = this.factory.createAdminController();
    var credentialController  = this.factory.createCredentialController();
    var encodingContoller     = this.factory.createEncodingController();

    adminController.attachSocket(socket);
    credentialController.attachSocket(socket);
    encodingContoller.attachSocket(socket);

    isAuth = userAuthorized.call(this, socket);
  }

  return isAuth;
};

var isUser = Promise.coroutine(function* (socket, data) {
  var schema  = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.PAIR);
  var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);
  var isAuth  = yield credentials.authenticateToken(socket.id, request.id, request.data);

  return isAuth ? userAuthorized.call(this, socket) : false;
});

var userAuthorized = function(socket) {
  socket.auth = true;

  var videoController = this.factory.createVideoController();
  var stateController = this.factory.createStateController();

  videoController.attachSocket(socket);
  stateController.attachSocket(socket);

  return socket.auth;
};
