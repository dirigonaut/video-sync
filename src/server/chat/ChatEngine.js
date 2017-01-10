var PlayerManager = require('../player/PlayerManager');

var playerManager = new PlayerManager();

function ChatEngine() { }

ChatEngine.prototype.broadcast = function(event, message) {
  console.log("ChatEngine.prototype.broadcast");
  if(event != null && message != null) {
    var players = playerManager.getPlayers();
    for(var p of players.keys()) {
      players.get(p).socket.emit(event, message);
      console.log(players.get(p).socket.id);
    }
  }
};

ChatEngine.prototype.ping = function(event, socket, message) {
  console.log(socket);
  if(event != null && message != null && socket != null) {
    socket.emit(event, message);
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
ChatEngine.Enum = {"PING" : "chat-ping-resp", "BROADCAST" : "chat-broadcast-resp", "LOG" : "chat-log-resp"};
