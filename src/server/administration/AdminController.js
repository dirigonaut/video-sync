const Promise         = require('bluebird');

var userAdmin, validator, commandEngine, chatEngine, redisSocket, publisher, session, log;

function AdminController() { }

AdminController.prototype.initialize = function (io, socket) {
  if(typeof AdminController.prototype.lazyInit === 'undefined') {
    userAdmin       = this.factory.createUserAdministration();
    validator       = this.factory.createValidator();
    commandEngine   = this.factory.createCommandEngine();
    chatEngine      = this.factory.createChatEngine();
    redisSocket     = this.factory.createRedisSocket();
    publisher       = this.factory.createRedisPublisher();
    session         = this.factory.createSession();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ADMINISTRATION);

    AdminController.prototype.lazyInit = true;
  }

  initialize.call(this, io, socket);
};

function initialize(io, socket) {
  log.info("Attaching AdminController");

  socket.on('admin-smtp-invite', Promise.coroutine(function* () {
    log.debug("admin-smtp-invite");
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      userAdmin.inviteUsers();
    }
  }.bind(this)));

  socket.on('admin-set-media', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      log.debug('admin-set-media');
      var fileIO = this.factory.createFileIO();

      var setMedia = Promise.coroutine(function* () {
        var fileUtils = yield factory.createFileSystemUtils();
        data = fileUtils.ensureEOL(data);

        yield session.setMediaPath(data);
        yield publisher.publishAsync(publisher.Enum.PLAYER, ['initPlayers', []]);

        var playerIds = yield publisher.publishAsync(publisher.Enum.PLAYER, ['getPlayerIds', []]);
        if(playerIds) {
          log.debug('media-ready');
          var message = chatEngine.buildMessage(socket.id, "Video has been initialized.");
          chatEngine.broadcast(chatEngine.Enum.EVENT, message);
          redisSocket.broadcast('media-ready');
        };
      }.bind(this));

      fileIO.dirExists(data, setMedia);
    }
  }.bind(this)));

  socket.on('admin-load-session', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      log.debug('admin-load-session');
      session.setSession(data);
    }
  }.bind(this)));

  socket.on('chat-command', Promise.coroutine(function* (data) {
    log.debug('chat-command', data);
    var player = yield publisher.publishAsync(Publisher.Enum.PLAYER, ['getPlayer', [socket.id]]);

    if(player) {
      var command = commandEngine.processAdminCommand(player, data);

      if(command && command.length > 0) {
        if(command[0] === CommandEngine.RespEnum.COMMAND) {
          let params = command[1];

          log.debug(`chat-command emitting event`);
          var commands = yield publisher.publishAsync.apply(null, params[0]);
          if(commands) {
            for(var i in commands) {
              redisSocket.ping.apply(null, commands[i]);
            }

            chatResponse.apply(null, params[1]);
          }
        } else if(command[0] === CommandEngine.RespEnum.CHAT) {
          let params = command[1];
          var message = chatEngine.buildMessage(socket.id, params[1]);

          if(params[0] === ChatEngine.Enum.PING) {
            log.silly('chat-command-response', data);
            chatEngine.ping(params[0], message);
          } else {
            log.silly('chat-command-response', data);
            chatEngine.broadcast(params[0], message);
          }
        }
      }
    }
  }.bind(this)));
}

module.exports = AdminController;
