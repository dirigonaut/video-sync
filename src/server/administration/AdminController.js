const Promise = require('bluebird');

var schemaFactory, sanitizer, redisSocket,
  publisher, media, fileIO, fileSystemUtils, playerManager, eventKeys, log;

function AdminController() { }

AdminController.prototype.initialize = function (force) {
  if(typeof AdminController.prototype.protoInit === 'undefined') {
    AdminController.prototype.protoInit = true;
    schemaFactory   = this.factory.createSchemaFactory();
    sanitizer       = this.factory.createSanitizer();
    fileIO          = this.factory.createFileIO();
    fileSystemUtils = this.factory.createFileSystemUtils();
    eventKeys       = this.factory.createKeys();

    publisher       = this.factory.createRedisPublisher();
    redisSocket     = this.factory.createRedisSocket();
    media           = this.factory.createMedia();

    playerManager   = this.factory.getPlayerManagerInfo();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ADMINISTRATION);
  }
};

AdminController.prototype.attachSocket = function(socket) {
  log.info('AdminController.attachSocket');

  socket.on(eventKeys.SETMEDIA, Promise.coroutine(function* (data) {
    log.debug(eventKeys.SETMEDIA);
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.PATH);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      var dir = fileSystemUtils.ensureEOL(request.data);
      var exists = yield fileIO.dirExists(dir);

      if(exists) {
        yield media.setMediaPath(dir);
        yield publisher.publishAsync(publisher.Enums.KEY.PLAYER, [playerManager.Functions.INITPLAYERS, []]);

        log.debug(eventKeys.MEDIAREADY);
        yield redisSocket.broadcast(eventKeys.MEDIAREADY);
      } else {
        log.socket(`${dir} is not found.`);
      }
    }
  }));
};

module.exports = AdminController;
