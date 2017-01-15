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

  socket.on('chat-broadcast', function(data) {
    Log.trace('chat-broadcast');

    var message = chatEngine.buildMessage(socket.id, data.text);
    chatEngine.broadcast(ChatEngine.Enum.BROADCAST, message);
  });

  socket.on('chat-command', function(data) {
    if(!session.isAdmin(socket.id)){
      console.log('chat-command');

      var response = function(event, text) {
        var message = chatEngine.buildMessage(socket.id, text);

        if(event === ChatEngine.Enum.PING) {
          chatEngine.ping(event, message);
        } else {
          chatEngine.broadcast(event, message);
        }
      }

      var player = playerManager.getPlayer(socket.id);
      commandEngine.processCommand(player, data, response);
    }
  });
}

module.exports = ChatController;
