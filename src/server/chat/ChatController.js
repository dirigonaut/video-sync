var PlayerManager = require('../state/player/PlayerManager');
var CommandEngine = require('./CommandEngine');
var ChatEngine    = require('./ChatEngine');
var Session       = require('../utils/Session');
var Logger        = require('../utils/Logger');

var playerManager = new PlayerManager();
var commandEngine = new CommandEngine();
var chatEngine    = new ChatEngine();
var session       = new Session();
var log           = new Logger();

function ChatController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  log.trace("Attaching ChatController");

  socket.on('chat-broadcast', function(data) {
    log.trace('chat-broadcast');

    var message = data;
    message.from = socket.id;
    chatEngine.broadcast(ChatEngine.Enum.BROADCAST, message);
  });

  socket.on('chat-private', function(data) {
    log.trace('chat-private');

    var player = playerManager.getPlayer(data.to);

    if(player != null && player != undefined) {
      var message = data;
      message.from = socket.id;
      
      chatEngine.ping(ChatEngine.Enum.PING, player.socket, message);
    } else {
      var message = chatEngine.buildMessage(ChatEngine.SYSTEM,
        "No such player by that name cannot send private message.");
      chatEngine.ping(ChatEngine.Enum.PING, player.socket, message);
    }
  });

  socket.on('chat-command', function(data) {
    if(!session.isAdmin(socket.id)){
      console.log('chat-command');

      var response = function(text) {
        var message = chatEngine.buildMessage(socket.id, text);
        chatEngine.broadcast(ChatEngine.Enum.BROADCAST, message);
      }

      commandEngine.processCommand(data, callback);
    }
  });
}

module.exports = ChatController;
