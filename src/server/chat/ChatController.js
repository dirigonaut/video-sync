const Promise = require('bluebird');

var commandEngine, chatEngine, redisSocket, publisher;

function ChatController() { }

ChatController.prototype.initialize = function() {
  if(typeof ChatController.prototype.protoInit === 'undefined') {
    ChatController.prototype.protoInit = true;

    commandEngine   = this.factory.createCommandEngine();
    chatEngine      = this.factory.createChatEngine();
    redisSocket     = this.factory.createRedisSocket();
    publisher       = this.factory.createRedisPublisher();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.CHAT);
  }
};

ChatController.prototype.attachSocket = function(io, socket) {
  log.debug("Attaching ChatController");

  socket.on('chat-broadcast', Promise.coroutine(function* (data) {
    log.debug('chat-broadcast');

    var message = chatEngine.buildMessage(socket.id, data.text);
    yield chatEngine.broadcast(chatEngine.Enum.BROADCAST, message);
  }.bind(this)));

  socket.on('chat-command', Promise.coroutine(function* (data) {
    log.debug('chat-command', data);
    var player = yield publisher.publishAsync(publisher.Enum.PLAYER, ['getPlayer', [socket.id]]);

    if(player) {
      var command = commandEngine.processCommand(player, data);

      if(command && command.length > 0) {
        if(command[0] === CommandEngine.RespEnum.COMMAND) {
          let params = command[1];

          log.debug(`chat-command emitting event`);
          var commands = yield publisher.publishAsync.apply(null, params[0]);
          if(commands) {
            for(var i in commands) {
              yield redisSocket.ping.apply(null, commands[i]);
            }

            chatResponse.apply(null, params[1]);
          }
        } else if(command[0] === CommandEngine.RespEnum.CHAT) {
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
  }.bind(this)));
};

module.exports = ChatController;
