const Promise       = require('bluebird');

var commandEngine, chatEngine, redisSocket, publisher;

function ChatController() { }

ChatController.prototype.initialize = Promise.coroutine(function* (io, socket) {
  if(typeof ChatController.prototype.lazyInit === 'undefined') {
    commandEngine   = yield this.factory.createCommandEngine();
    chatEngine      = yield this.factory.createChatEngine();
    redisSocket     = yield this.factory.createRedisSocket();
    publisher       = yield this.factory.createRedisPublisher();
    ChatController.prototype.lazyInit = true;
  }

  initialize.call(this, io, socket);
});

module.exports = ChatController;

function initialize(io, socket) {
  this.log.debug("Attaching ChatController");

  socket.on('chat-broadcast', function(data) {
    this.log.debug('chat-broadcast');

    var message = chatEngine.buildMessage(socket.id, data.text);
    chatEngine.broadcast(ChatEngine.Enum.BROADCAST, message);
  }.bind(this));

  socket.on('chat-command', Promise.coroutine(function* (data) {
    this.log.debug('chat-command', data);
    var chatResponse = function(eventName, text) {
      var message = chatEngine.buildMessage(socket.id, text);

      if(eventName === ChatEngine.Enum.PING) {
        this.log.silly('chat-command-response', data);
        chatEngine.ping(eventName, message);
      } else {
        this.log.silly('chat-command-response', data);
        chatEngine.broadcast(eventName, message);
      }
    }.bind(this);

    var stateResponse = function(command, chat) {
      this.log.debug(`chat-command emitting event`);
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
    };

    var player = yield publisher.publishAsync(Publisher.Enum.PLAYER, ['getPlayer', [socket.id]]);
    if(player) {
      commandEngine.processCommand(player, data, handleResponse);
    }
  }.bind(this)));
}
