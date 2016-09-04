var CommandEngine = require('./CommandEngine');
var ChatEngine    = require('./ChatEngine');
var Session       = require('../utils/Session');

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
    chatEngine.broadcast(data);
  });

  socket.on('chat-private', function(data) {
    console.log('chat-private');
    chatEngine.ping(data.socket, data.message);
  });

  socket.on('chat-command', function(data) {
    if(!session.isAdmin(socket.id)){
      console.log('chat-command');

      var response = function(message) {
        chatEngine.broadcast(message);
      }

      commandEngine.processCommand(data);
    }
  });
}

module.export = ChatController;
