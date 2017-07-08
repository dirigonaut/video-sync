const Promise = require('bluebird');

var userAdmin, schemaFactory, sanitizer, commandEngine, chatEngine, redisSocket,
  publisher, session, fileIO, fileSystemUtils, playerManager, log;

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
  socket.on('admin-smtp-invite', Promise.coroutine(function* () {
    var isAdmin = yield session.isAdmin(socket.id);

    if(isAdmin) {
      log.debug('admin-smtp-invite');
      userAdmin.inviteUsers();
      socket.emit('admin-smtp-invited');
    }
  }));

  socket.on('admin-set-media', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      log.debug('admin-set-media', data);
      var schema = schemaFactory.createDefinition(schemaFactory.Enum.PATH);
      var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

      if(request) {
        var exists = fileIO.dirExists(request.data);

        if(exists) {
          data = fileSystemUtils.ensureEOL(request.data);

          yield session.setMediaPath(request.data);
          yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.INITPLAYERS, []]);

          var playerIds = yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.GETPLAYERIDS, []]);
          if(playerIds) {
            log.debug('media-ready');
            var message = chatEngine.buildMessage(socket.id, 'Video has been initialized.');
            yield chatEngine.broadcast(chatEngine.Enum.EVENT, message);
            yield redisSocket.broadcast('media-ready');
          };
        }
      }
    }
  }));

  socket.on('admin-load-session', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      log.debug('admin-load-session', data);

      var schema = schemaFactory.createDefinition(schemaFactory.Enum.STRING);
      var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

      if(request) {
        session.setSession(request.data);
        socket.emit('admin-loaded-session');
      }
    }
  }));

  socket.on('chat-command', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);

    if(isAdmin) {
      log.debug('chat-command', data);
      var schema = schemaFactory.createDefinition(schemaFactory.Enum.COMMAND);
      var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

      if(request) {
        var player = yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.GETPLAYER, [socket.id]]);

        if(player) {
          var command = commandEngine.processAdminCommand(player, request);

          if(command && command.length > 0) {
            if(command[0] === commandEngine.RespEnum.COMMAND) {
              let params = command[1];

              log.debug(`chat-command emitting event`);
              var commands = yield publisher.publishAsync.apply(null, params[0]);
              if(commands) {
                for(var i in commands) {
                  yield redisSocket.ping.apply(null, commands[i]);
                }

                chatResponse.apply(null, params[1]);
              }
            } else if(command[0] === commandEngine.RespEnum.CHAT) {
              let params = command[1];
              var message = chatEngine.buildMessage(socket.id, params[1]);

              if(params[0] === chatEngine.Enum.PING) {
                log.silly('chat-command-response', request);
                yield chatEngine.ping(params[0], message);
              } else {
                log.silly('chat-command-response', request);
                yield chatEngine.broadcast(params[0], message);
              }
            }
          }
        }
      }
    }
  }));
};


module.exports = AdminController;
