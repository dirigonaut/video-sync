var PlayerManager = require('../state/player/PlayerManager');

var playerManager = new PlayerManager();

function ChatEngine() { }

ChatEngine.prototype.broadcast = function(event, message) {
  console.log("ChatEngine.prototype.broadcast");
  if(event != null && message != null) {
    for(var player of playerManager.getPlayers()) {
      player[1].socket.emit(event, message);
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
