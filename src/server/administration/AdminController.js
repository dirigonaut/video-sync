const Promise         = require('bluebird');

var userAdmin, validator, commandEngine, chatEngine, redisSocket, publisher;

function AdminController() { }

AdminController.prototype.initialize = Promise.coroutine(function* (io, socket) {
  if(typeof AdminController.prototype.lazyInit === 'undefined') {
    userAdmin       = yield this.factory.createUserAdministration();
    validator       = yield this.factory.createValidator();
    commandEngine   = yield this.factory.createCommandEngine();
    chatEngine      = yield this.factory.createChatEngine();
    redisSocket     = yield this.factory.createRedisSocket();
    publisher       = yield this.factory.createRedisPublisher();
    AdminController.prototype.lazyInit = true;
  }

  initialize.call(this, io, socket);
});

function initialize(io, socket) {
  log.info("Attaching AdminController");

  socket.on('admin-smtp-invite', Promise.coroutine(function* () {
    log.debug("admin-smtp-invite");
    var isAdmin = yield this.session.isAdmin(socket.id);
    if(isAdmin) {
      userAdmin.inviteUsers();
    }
  }.bind(this)));

  socket.on('admin-set-media', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      log.debug('admin-set-media');
      var fileIO = yield this.factory.createFileIO();

      var setMedia = Promise.coroutine(function* () {
        var fileUtils = yield this.factory.createFileSystemUtils();
        data = fileUtils.ensureEOL(data);

        yield session.setMediaPath(data);
        yield publisher.publishAsync(Publisher.Enum.PLAYER, ['initPlayers', []]);

        var playerIds = yield publisher.publishAsync(Publisher.Enum.PLAYER, ['getPlayerIds', []]);
        if(playerIds) {
          log.debug('media-ready');
          var message = chatEngine.buildMessage(socket.id, "Video has been initialized.");
          chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
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
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      log.debug('admin-chat-command');

      var chatResponse = function(event, text) {
        var message = chatEngine.buildMessage(socket.id, text);

        if(event === ChatEngine.Enum.PING) {
          log.silly('chat-command-response', data);
          chatEngine.ping(event, message);
        } else {
          log.silly('chat-command-response', data);
          chatEngine.broadcast(event, message);
        }
      }.bind(this);

      var stateResponse = function(command, chat) {
        log.debug(`admin-chat-command emitting event`);
        var onState = function(commands) {
          for(var i in commands) {
            redisSocket.ping.apply(null, commands[i]);
          }

          chatResponse.apply(null, chat);
        };

        command.push(onState);
        publisher.publish.apply(null, command);
      }.bind(this);

      var handleResponse = function(key, param) {
        if(key === CommandEngine.RespEnum.COMMAND) {
          stateResponse.apply(null, param);
        } else if(key === CommandEngine.RespEnum.CHAT){
          chatResponse.apply(null, param);
        }
      }.bind(this);

      var admin = yield publisher.publishAsync(Publisher.Enum.PLAYER, ['getPlayer', [socket.id]]);
      if(admin) {
        commandEngine.processAdminCommand(admin, data, handleResponse);
      }
    }
  }.bind(this)));
}

module.exports = AdminController;
