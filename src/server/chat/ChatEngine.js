var Publisher   = require('../process/redis/RedisPublisher');
var RedisSocket = require('../process/redis/RedisSocket');
var LogManager  = require('../log/LogManager');

var log         = LogManager.getLog(LogManager.LogEnum.CHAT);
var redisSocket, publisher;

function lazyInit() {
  redisSocket   = new RedisSocket();
  publisher     = new Publisher();
}

class ChatEngine {
  constructor() {
    if(typeof ChatEngine.prototype.lazyInit === 'undefined') {
      lazyInit();
      ChatEngine.prototype.lazyInit = true;
    }
  }

  broadcast(event, message) {
    log.debug(`ChatEngine.prototype.broadcast ${event}`);
    if(event !== null && message !== null) {
      redisSocket.broadcast(event, message);
    }
  }

  ping(event, message) {
    log.debug(`ChatEngine.prototype.ping ${event}`);
    if(event !== null && event !== undefined && message !== null && message !== undefined) {
      if(message.from !== undefined && message.from !== null) {
        redisSocket.ping(message.from, event, message);
      }
    }
  }

  buildMessage(from, text) {
    var message = new Object();
    message.from = from;
    message.text = text;
    return message;
  }
}

module.exports = ChatEngine;

ChatEngine.SYSTEM = "System";
ChatEngine.Enum = {BROADCAST : "chat-broadcast-resp", PING : "chat-ping-resp", LOG : "chat-log-resp", EVENT : "chat-event-resp"};
