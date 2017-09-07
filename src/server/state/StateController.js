const Promise  = require('bluebird');

var player, schemaFactory, sanitizer, chatEngine, redisSocket, publisher, stateEngine, eventKeys, log;

function StateController() { }

StateController.prototype.initialize = function(force) {
  if(typeof StateController.prototype.protoInit === 'undefined') {
    StateController.prototype.protoInit = true;
    player          = this.factory.createPlayer();
    schemaFactory   = this.factory.createSchemaFactory();
    sanitizer       = this.factory.createSanitizer();
    chatEngine      = this.factory.createChatEngine();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.STATE);
  }

  if(force === undefined ? typeof StateController.prototype.stateInit === 'undefined' : force) {
    StateController.prototype.stateInit = true;
    publisher       = this.factory.createRedisPublisher();
    redisSocket     = this.factory.createRedisSocket();
    stateEngine     = this.factory.createStateEngine(false);
  }
};

StateController.prototype.attachSocket = function(socket) {
  log.info('StateController.attachSocket');

  socket.on(eventKeys.REQPLAY, Promise.coroutine(function* () {
    log.info(eventKeys.REQPLAY);

    var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.PLAY, [socket.id]]);
    if(commands) {
      for(var i = 0; i < commands.length; ++i) {
        yield redisSocket.ping.apply(null, commands[i]);
      }

      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, 'issued play.']);
      yield chatEngine.broadcast(eventKeys.EVENTRESP, response);
    }
  }));

  socket.on(eventKeys.REQPAUSE, Promise.coroutine(function* () {
    log.debug(eventKeys.REQPAUSE);

    var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.PAUSE, [socket.id]]);
    if(commands) {
      for(var i = 0; i < commands.length; ++i) {
        yield redisSocket.ping.apply(null, commands[i]);
      }

      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, 'issued pause.']);
      yield chatEngine.broadcast(eventKeys.EVENTRESP, response);
    }
  }));

  socket.on(eventKeys.REQSEEK, Promise.coroutine(function* (data) {
    log.debug(eventKeys.REQSEEK, data);

    var schema = schemaFactory.createDefinition(schemaFactory.Enum.STATE);
    var request = sanitizer.sanitize(data, schema, [schema.Enum.TIMESTAMP], socket);

    if(request) {
      var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.SEEK, [socket.id, request]]);

      if(commands) {
        for(var i = 0; i < commands.length; ++i) {
          yield redisSocket.ping.apply(null, commands[i]);
        }

        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, `issued seek to ${request.timestamp}.`]);
        yield chatEngine.broadcast(eventKeys.EVENTRESP, response);
      }
    }
  }));

  socket.on(eventKeys.SYNC, Promise.coroutine(function* () {
    log.debug(eventKeys.SYNC);
    var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.SYNC, [socket.id]]);

    if(commands) {
      for(var i = 0; i < commands.length; ++i) {
        log.debug(`state-sync sync`, commands[i]);
        yield redisSocket.ping.apply(null, commands[i]);
      }

      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, 'issued sync.']);
      yield chatEngine.broadcast(eventKeys.EVENTRESP, response);
    }
  }));

  socket.on(eventKeys.CHANGESYNC, Promise.coroutine(function* (data) {
    log.debug(eventKeys.CHANGESYNC, data);

    var schema = schemaFactory.createDefinition(schemaFactory.Enum.BOOL);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      var value = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.CHANGESYNCSTATE, [socket.id, request]]);
      if(typeof value === 'boolean') {
        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, ` desync value is ${value}.`]);
        yield chatEngine.broadcast(eventKeys.EVENTRESP, response);

        socket.emit('state-sync-state', schemaFactory.createPopulatedSchema(schemaFactory.Enum.RESPONSE, [value]));
      }
    }
  }));

  socket.on(eventKeys.PING, Promise.coroutine(function* (data, acknowledge) {
    log.silly(eventKeys.PING, data);

    if(typeof acknowledge === 'function') {
      acknowledge(null, true);
    }

    var schema = schemaFactory.createDefinition(schemaFactory.Enum.STATE);
    var request = sanitizer.sanitize(data, schema, [schema.Enum.TIMESTAMP], socket);

    if(request) {
      var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.SYNCINGPING, [socket.id, request]]);

      if(commands) {
        for(var i = 0; i < commands.length; ++i) {
          log.debug('Ping command', commands[i]);
          yield redisSocket.ping.apply(null, commands[i]);
        }
      }
    }
  }));
};

module.exports = StateController;
