var PlayerManager = require('../player/PlayerManager');
var LogManager    = require('../log/LogManager');

var playerManager = new PlayerManager();
var log           = LogManager.getLog(LogManager.LogEnum.CHAT);

function ChatEngine() { }

ChatEngine.prototype.broadcast = function(event, message) {
  log.debug("ChatEngine.prototype.broadcast");
  if(event !== null && message !== null) {
    var players = playerManager.getPlayers();
    for(var p of players.keys()) {
      players.get(p).socket.emit(event, message);
    }
  }
};

ChatEngine.prototype.ping = function(event, message) {
  log.debug("ChatEngine.prototype.ping");
  var player = playerManager.getPlayer(message.from);
  if(player !== undefined && player !== null) {
    var socket = player.socket;
    if(event !== null && message !== null && socket !== null) {
      socket.emit(event, message);
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
