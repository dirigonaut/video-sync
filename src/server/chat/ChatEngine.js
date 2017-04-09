var Publisher  = require('../process/redis/redis/RedisPublisher');
var LogManager = require('../log/LogManager');

var log       = LogManager.getLog(LogManager.LogEnum.CHAT);
var publisher = new Publisher();

function ChatEngine() { }

ChatEngine.prototype.broadcast = function(event, message) {
  log.debug("ChatEngine.prototype.broadcast");
  if(event !== null && message !== null) {
    var broadcast = function(players) {
      for(var p of players.keys()) {
        players.get(p).socket.emit(event, message);
      }
    }

    publisher.publish(Publisher.Enum.PLAYER, ['getPlayers', []], broadcast);
  }
};

ChatEngine.prototype.ping = function(event, message) {
  log.debug("ChatEngine.prototype.ping");
  var ping = function(player) {
    if(player !== undefined && player !== null) {
      var socket = player.socket;

      if(event !== null && message !== null && socket !== null) {
        socket.emit(event, message);
      }
    }
  }

  publisher.publish(Publisher.Enum.PLAYER, ['getPlayer', [message.from]], ping);
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
