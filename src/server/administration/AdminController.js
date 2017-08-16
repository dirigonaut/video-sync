const Promise = require('bluebird');

var userAdmin, schemaFactory, sanitizer, commandEngine, chatEngine, redisSocket,
  publisher, session, fileIO, fileSystemUtils, playerManager, eventKeys, log;

function AdminController() { }

AdminController.prototype.initialize = function (force) {
  if(typeof AdminController.prototype.protoInit === 'undefined') {
    AdminController.prototype.protoInit = true;
    userAdmin       = this.factory.createUserAdministration();
    schemaFactory   = this.factory.createSchemaFactory();
    sanitizer       = this.factory.createSanitizer();
    commandEngine   = this.factory.createCommandEngine();
    chatEngine      = this.factory.createChatEngine();
    fileIO          = this.factory.createFileIO();
    fileSystemUtils = this.factory.createFileSystemUtils();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ADMINISTRATION);
  }

  if(force === undefined ? typeof AdminController.prototype.stateInit === 'undefined' : force) {
    AdminController.prototype.stateInit = true;
    publisher       = this.factory.createRedisPublisher();
    redisSocket     = this.factory.createRedisSocket();
    session         = this.factory.createSession();
    playerManager   = this.factory.createPlayerManager(false);
  }
};

AdminController.prototype.attachSocket = function(socket) {
  log.info('AdminController.attachSocket');

  socket.on(eventKeys.INVITE, Promise.coroutine(function* () {
    var isAdmin = yield session.isAdmin(socket.id);

    if(isAdmin) {
      log.debug(eventKeys.INVITE);
      userAdmin.inviteUsers();
      socket.emit(eventKeys.INVITED);
    }
  }));

  socket.on(eventKeys.SETMEDIA, Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      log.debug(eventKeys.SETMEDIA);
      var schema = schemaFactory.createDefinition(schemaFactory.Enum.PATH);
      var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

      if(request) {
        var exists = fileIO.dirExists(request.data);

        if(exists) {
          data = fileSystemUtils.ensureEOL(request.data);

          yield session.setMediaPath(request.data);
          yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.INITPLAYERS, []]);

          log.debug(eventKeys.MEDIAREADY);
          var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, 'Video has been initialized.']);
          yield chatEngine.broadcast(eventKeys.EVENTRESP, response);
          yield redisSocket.broadcast(eventKeys.MEDIAREADY);
        }
      }
    }
  }));

  socket.on(eventKeys.LOADSESSION, Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      log.debug(eventKeys.LOADSESSION);

      var schema = schemaFactory.createDefinition(schemaFactory.Enum.STRING);
      var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

      if(request) {
        session.setSession(request.data);
        socket.emit(eventKeys.LOADEDSESSION);
      }
    }
  }));
};

module.exports = AdminController;
