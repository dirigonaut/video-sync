var PlayerManager = require('../state/player/PlayerManager');

var playerManager = new PlayerManager();

function ChatEngine() { }

ChatEngine.prototype.broadcast = function(event, message) {
  if(event != null && message != null) {
    for(var player of playerManager.getPlayers()) {
      player[1].socket.emit(event, message);
    }
  }
};

ChatEngine.prototype.ping = function(event, message) {
  if(event != null && message != null && message.toSocket != null) {
    message.toSocket.emit(event, message);
  }
};

ChatEngine.prototype.buildMessage = function(from, toSocket, text) {
  var message = new Object();
  message.from = from;
  mesasge.toSocket = toSocket;
  message.text = text;
  return message;
};

module.export = ChatEngine;

ChatEngine.SYSTEM = "system";
ChatEngine.Enum = {"PING" : "chat-ping-resp", "BROADCAST" : "chat-broadcast-resp", "LOG" : "chat-log-resp"};
