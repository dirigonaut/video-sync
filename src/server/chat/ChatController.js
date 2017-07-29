const Promise = require('bluebird');

var commandEngine, chatEngine, redisSocket, publisher, playerManager, session, schemaFactory, sanitizer, eventKeys, log;

function ChatController() { }

ChatController.prototype.initialize = function(force) {
  if(typeof ChatController.prototype.protoInit === 'undefined') {
    ChatController.prototype.protoInit = true;
    commandEngine   = this.factory.createCommandEngine();
    chatEngine      = this.factory.createChatEngine();
    schemaFactory   = this.factory.createSchemaFactory();
    sanitizer       = this.factory.createSanitizer();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.CHAT);
  }

  if(force === undefined ? typeof ChatController.prototype.stateInit === 'undefined' : force) {
    ChatController.prototype.stateInit = true;
    redisSocket     = this.factory.createRedisSocket();
    publisher       = this.factory.createRedisPublisher();
    playerManager   = this.factory.createPlayerManager(false);
    session         = this.factory.createSession();
  }
};

ChatController.prototype.attachSocket = Promise.coroutine(function* (socket) {
  log.debug("Attaching ChatController");

  socket.on(eventKeys.BROADCAST, Promise.coroutine(function* (data) {
    log.debug(eventKeys.BROADCAST);
    var schema = schemaFactory.createDefinition(schemaFactory.Enum.STRING);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

    if(request) {
      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, request.data]);
      yield chatEngine.broadcast(chatEngine.Enum.BROADCAST, response);
    }
  }.bind(this)));

  var processCommand;

  var isAdmin = yield session.isAdmin(socket.id);
  if(isAdmin) {
    processcommand = commandEngine.processAdminCommand;
  } else {
    processcommand = commandEngine.processCommand;
  }

  socket.on(eventKeys.COMMAND, Promise.coroutine(function* (data) {
    log.debug(eventKeys.COMMAND, data);
    var schema = schemaFactory.createDefinition(schemaFactory.Enum.COMMAND);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

    if(request) {
      var player = yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.GETPLAYER, [socket.id]]);

      if(player) {
        var command = processcommand(player, request);

        if(command && command.length > 0) {
          if(command[0] === CommandEngine.RespEnum.COMMAND) {
            let params = command[1];

            var commands = yield publisher.publishAsync.apply(null, params[0]);
            if(commands) {
              for(var i in commands) {
                yield redisSocket.ping.apply(null, commands[i]);
              }

              chatResponse.apply(null, params[1]);
            }
          } else if(command[0] === CommandEngine.RespEnum.CHAT) {
            let params = command[1];
            var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, params[1]]);

            if(params[0] === chatEngine.Enum.PING) {
              yield chatEngine.ping(params[0], response);
            } else {
              yield chatEngine.broadcast(params[0], response);
            }
          }
        }
      }
    }
  }.bind(this)));
});

module.exports = ChatController;
