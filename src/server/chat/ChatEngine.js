const Promise = require('bluebird');

var redisSocket, publisher, log;

function ChatEngine() { }

ChatEngine.prototype.initialize = function(force) {
  if(typeof ChatEngine.prototype.protoInit === 'undefined') {
    ChatEngine.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.CHAT);
  }

  if(force === undefined ? typeof ChatEngine.prototype.stateInit === 'undefined' : force) {
    ChatEngine.prototype.stateInit = true;
    redisSocket     = this.factory.createRedisSocket();
    publisher       = this.factory.createRedisPublisher();
  }
};

ChatEngine.prototype.broadcast = Promise.coroutine(function* (eventName, message) {
  log.debug(`ChatEngine.broadcast ${eventName}`);
  if(eventName && message) {
    yield redisSocket.broadcast(eventName, message);
  }
});

ChatEngine.prototype.ping = Promise.coroutine(function* (eventName, message) {
  log.debug(`ChatEngine.ping ${eventName}`);
  if(eventName && message) {
    if(message.from) {
      yield redisSocket.ping(message.from, eventName, message);
    }
  }
});

module.exports = ChatEngine;

ChatEngine.Enum = { BROADCAST : "chat-broadcast-resp", PING : "chat-ping-resp", LOG : "chat-log-resp", EVENT : "chat-event-resp" };

ChatEngine.prototype.Enum = ChatEngine.Enum;
