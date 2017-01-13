var PlayerManager = require('../player/PlayerManager');
var CommandEngine = require('./CommandEngine');
var ChatEngine    = require('./ChatEngine');
var Session       = require('../administration/Session');
var Log           = require('../utils/Logger');

var playerManager = new PlayerManager();
var commandEngine = new CommandEngine();
var chatEngine    = new ChatEngine();
var session       = new Session();

function ChatController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  Log.trace("Attaching ChatController");
  chatEngine.ping(ChatEngine.Enum.PING, socket, "Welcome!");

  socket.on('chat-broadcast', function(data) {
    Log.trace('chat-broadcast');

    var message = data;
    message.from = socket.id;
    chatEngine.broadcast(ChatEngine.Enum.BROADCAST, message);
  });

  socket.on('chat-command', function(data) {
    if(!session.isAdmin(socket.id)){
      console.Log('chat-command');

      var response = function(text) {
        var message = chatEngine.buildMessage(socket.id, text);
        chatEngine.broadcast(ChatEngine.Enum.BROADCAST, message);
      }

      data.issuer = socket;
      commandEngine.processCommand(data, callback);
    }
  });
}

module.exports = ChatController;
