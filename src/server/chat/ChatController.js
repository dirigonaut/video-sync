var CommandEngine = require('./CommandEngine');
var ChatEngine    = require('./ChatEngine');
var Session       = require('../administration/Session');
var LogManager    = require('../log/LogManager');
var Publisher     = require('../process/redis/RedisPublisher');

var log           = LogManager.getLog(LogManager.LogEnum.CHAT);
var commandEngine = new CommandEngine();
var chatEngine    = new ChatEngine();
var session       = new Session();
var publisher     = new Publisher();

function ChatController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  log.debug("Attaching ChatController");

  socket.on('chat-broadcast', function(data) {
    log.debug('chat-broadcast');

    var message = chatEngine.buildMessage(socket.id, data.text);
    chatEngine.broadcast(ChatEngine.Enum.BROADCAST, message);
  });

  socket.on('chat-command', function(data) {
    if(!session.isAdmin(socket.id)){
      log.debug('chat-command', data);

      var chatResponse = function(event, text) {
        var message = chatEngine.buildMessage(socket.id, text);

        if(event === ChatEngine.Enum.PING) {
          log.silly('chat-command-response', data);
          chatEngine.ping(event, message);
        } else {
          log.silly('chat-command-response', data);
          chatEngine.broadcast(event, message);
        }
      };

      var stateResponse = function(event, data) {
        socket.emit(event, data);
      };

      var handleResponse = function(key, param) {
        if(key === CommandEngine.RespEnum.COMMAND) {
          stateResponse.apply(null, param);
        } else if(key === CommandEngine.RespEnum.CHAT){
          chatResponse.apply(null, param);
        }
      };

      var processCommand = function(player) {
        commandEngine.processCommand(player, data, handleResponse);
      }

      publisher.publish(Publisher.Enum.PLAYER, ['getPlayer', [socket.id]], processCommand);
    }
  });
}

module.exports = ChatController;
