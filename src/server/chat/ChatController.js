var PlayerManager = require('../state/player/PlayerManager');

var playerManager = new PlayerManager();

function ChatController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  console.log("Attaching ChatController");

  socket.on('chat-broadcast', function(data) {

  });

  socket.on('chat-private', function(data) {

  });

  socket.on('chat-command', function(data) {

  });
}

module.export = ChatController;
