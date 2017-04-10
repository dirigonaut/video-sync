var Publisher   = require('../process/redis/RedisPublisher');
var RedisSocket = require('../process/redis/RedisSocket');
var LogManager  = require('../log/LogManager');

var log         = LogManager.getLog(LogManager.LogEnum.CHAT);
var redisSocket = new RedisSocket();
var publisher   = new Publisher();

function ChatEngine() {
}

ChatEngine.prototype.broadcast = function(event, message) {
  log.debug("ChatEngine.prototype.broadcast");
  if(event !== null && message !== null) {
    var broadcast = function(players) {
      redisSocket.broadcastToIds(players, event, message);
    }

    publisher.publish(Publisher.Enum.PLAYER, ['getPlayerIds', []], broadcast);
  }
};

ChatEngine.prototype.ping = function(event, message) {
  log.debug("ChatEngine.prototype.ping");
  if(event !== null && event !== undefined && message !== null && message !== undefined) {
    if(message.from !== undefined && message.from !== null) {
      redisSocket.broadcastToIds(message.from, event, message);
    }
  }
};


ChatEngine.prototype.buildMessage = function(from, text) {
  var message = new Object();
  message.from = from;
  message.text = text;
  return message;
};

module.exports = ChatEngine;

ChatEngine.SYSTEM = "system";
ChatEngine.Enum = {"BROADCAST" : "chat-broadcast-resp", "PING" : "chat-ping-resp", "LOG" : "chat-log-resp", "EVENT" : "chat-event-resp"};
