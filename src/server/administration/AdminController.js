const Path    = require('path');
const Promise = require('bluebird');

var config, schemaFactory, sanitizer, redisSocket,
  publisher, media, fileIO, fileSystemUtils, playerManager, eventKeys, log;

function AdminController() { }

AdminController.prototype.initialize = function (force) {
  if(typeof AdminController.prototype.protoInit === 'undefined') {
    AdminController.prototype.protoInit = true;
    config          = this.factory.createConfig();
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
        yield redisSocket.broadcast.call(this, eventKeys.MEDIAREADY);
        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.LOGRESPONSE,
          [new Date().toTimeString(), 'notify', 'media', `Media is loaded.`]);
        yield redisSocket.broadcast.call(AdminController.prototype, eventKeys.NOTIFICATION, response);
      } else {
        log.socket(`${dir} is not found.`);
      }
    }
  }));

  socket.on(eventKeys.SETSYNCRULE, Promise.coroutine(function* (data) {
    log.debug(eventKeys.SETSYNCRULE);
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.NUMBER);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      media.setMediaRule(request.data)
      .then(Promise.coroutine(function* () {
        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.LOGRESPONSE,
          [new Date().toTimeString(), 'notify', 'media', `${request.data ? 'Auto Sync set to ' + request.data + 's.' : 'Auto Sync turned off.'}`]);

        yield redisSocket.broadcast.call(AdminController.prototype, eventKeys.NOTIFICATION, response);
      })).catch(function(error) {
        log.socket(error);
      });
    }
  }));

  socket.on(eventKeys.GETSYNCRULE, Promise.coroutine(function* () {
    log.debug(eventKeys.GETSYNCRULE);

    var rule = yield media.setMediaRule(request.data);
    socket.emit(eventKeys.SYNCRULE, rule);
  }));

  socket.on(eventKeys.GETFOLDERS, Promise.coroutine(function* (data) {
    log.debug(eventKeys.GETFOLDERS, data);
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.STRING);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      var folders = yield getFolders(socket, request);
      socket.emit(eventKeys.FOLDERS, folders);
    }
  }));
};

module.exports = AdminController;

var getFolders = Promise.coroutine(function* (socket, request) {
  var basePath = yield config.getConfig().videoSyncInfo[request.data];
  var folders = [];

  if(basePath) {
    var entries = yield fileIO.readDirAsync(basePath);

    for(let i = 0; i < entries.length; ++i) {
      var isDir = yield fileIO.isDir(Path.join(basePath, entries[i]));

      if(isDir) {
        folders.push(Path.join(basePath, entries[i]));
      }
    }
  } else {
    log.error(`Socket: ${socket.id} requested folders in dir variable: ${request.data}, which is not in the config.`);
  }

  return folders;
});
