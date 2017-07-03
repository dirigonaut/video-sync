const Promise         = require('bluebird');

var userAdmin, validator, commandEngine, chatEngine, redisSocket, publisher, session, fileIO, fileSystemUtils, log;

function AdminController() { }

AdminController.prototype.initialize = function () {
  if(typeof AdminController.prototype.protoInit === 'undefined') {
    userAdmin       = this.factory.createUserAdministration();
    validator       = this.factory.createValidator();
    commandEngine   = this.factory.createCommandEngine();
    chatEngine      = this.factory.createChatEngine();
    redisSocket     = this.factory.createRedisSocket();
    publisher       = this.factory.createRedisPublisher();
    session         = this.factory.createSession();
    fileIO          = this.factory.createFileIO();
    fileSystemUtils = this.factory.createFileSystemUtils();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ADMINISTRATION);

    AdminController.prototype.protoInit = true;
  }
};

AdminController.prototype.attachSocket = function(io, socket) {
  log.info('AdminController.attachSocket');
  socket.on('admin-smtp-invite', Promise.coroutine(function* () {
    log.debug('admin-smtp-invite');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      userAdmin.inviteUsers();
    }
  }));

  socket.on('admin-set-media', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      log.debug('admin-set-media');

      var exists = fileIO.dirExists(data);
      if(exists) {
        data = fileSystemUtils.ensureEOL(data);

        yield session.setMediaPath(data);
        yield publisher.publishAsync(publisher.Enum.PLAYER, ['initPlayers', []]);

        var playerIds = yield publisher.publishAsync(publisher.Enum.PLAYER, ['getPlayerIds', []]);
        if(playerIds) {
          log.debug('media-ready');
          var message = chatEngine.buildMessage(socket.id, 'Video has been initialized.');
          yield chatEngine.broadcast(chatEngine.Enum.EVENT, message);
          yield redisSocket.broadcast('media-ready');
        };
      }
    }
  }));

  socket.on('admin-load-session', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      log.debug('admin-load-session');
      session.setSession(data);
    }
  }));

  socket.on('chat-command', Promise.coroutine(function* (data) {
    log.debug('chat-command', data);
    var player = yield publisher.publishAsync(publisher.Enum.PLAYER, ['getPlayer', [socket.id]]);

    if(player) {
      var command = commandEngine.processAdminCommand(player, data);

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
            log.silly('chat-command-response', data);
            yield chatEngine.ping(params[0], message);
          } else {
            log.silly('chat-command-response', data);
            yield chatEngine.broadcast(params[0], message);
          }
        }
      }
    }
  }));
};


module.exports = AdminController;
