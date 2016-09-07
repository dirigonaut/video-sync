var PlayerManager = require('../state/player/PlayerManager');
var CommandEngine = require('./CommandEngine');
var ChatEngine    = require('./ChatEngine');
var Session       = require('../utils/Session');

var playerManager = new PlayerManager();
var commandEngine = new CommandEngine();
var chatEngine    = new ChatEngine();
var session       = new Session();

function ChatController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  console.log("Attaching ChatController");

  socket.on('chat-broadcast', function(data) {
    console.log('chat-broadcast');

    var message = chatEngine.buildMessage(socket.id, null, data);
    chatEngine.broadcast(ChatEngine.Enum.BROADCAST, message);
  });

  socket.on('chat-private', function(data) {
    console.log('chat-private');

    var player = playerManager.getPlayer(data.to);

    if(player != null) {
      var message = chatEngine.buildMessage(socket.id, player.socket, data.text);
      chatEngine.ping(ChatEngine.Enum.PING, message);
    } else {
      var message = chatEngine.buildMessage(ChatEngine.SYSTEM, socket,
        "No such player by that name cannot send private message.");
      chatEngine.ping(ChatEngine.Enum.PING, message);
    }
  });

  socket.on('chat-command', function(data) {
    if(!session.isAdmin(socket.id)){
      console.log('chat-command');

      var response = function(text) {
        var message = chatEngine.buildMessage(socket.id, null, text);
        chatEngine.broadcast(ChatEngine.Enum.BROADCAST, message);
      }

      commandEngine.processCommand(data);
    }
  });
}

module.exports = ChatController;
