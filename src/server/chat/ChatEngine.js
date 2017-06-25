const Promise = require('bluebird');

var redisSocket, publisher;

function ChatEngine() { }

ChatEngine.prototype.initialize = Promise.coroutine(function* () {
  if(typeof ChatEngine.prototype.lazyInit === 'undefined') {
    redisSocket   = yield this.factory.createRedisSocket();
    publisher     = yield this.factory.createRedisPublisher();
    ChatEngine.prototype.lazyInit = true;
  }
};

ChatEngine.prototype.broadcast = function(eventName, message) {
  this.log.debug(`ChatEngine.prototype.broadcast ${eventName}`);
  if(eventName) {
    redisSocket.broadcast(eventName, message);
  }
});

ChatEngine.prototype.ping = function(eventName, message) {
  this.log.debug(`ChatEngine.prototype.ping ${eventName}`);
  if(eventName && message) {
    if(message.from) {
      redisSocket.ping(message.from, eventName, message);
    }
  }
};

ChatEngine.prototype.buildMessage = function(sender, text) {
  var message = {};
  message.from = sender;
  message.text = text;
  return message;
}

module.exports = ChatEngine;

ChatEngine.SYSTEM = "System";
ChatEngine.Enum = {BROADCAST : "chat-broadcast-resp", PING : "chat-ping-resp", LOG : "chat-log-resp", EVENT : "chat-event-resp"};
