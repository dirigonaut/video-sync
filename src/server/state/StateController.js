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

  socket.on(eventKeys.REQINIT, Promise.coroutine(function*() {
    log.debug(eventKeys.REQINIT);
    var command = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.INITPLAYER, [socket.id]]);
    if(command) {
      socket.emit(command[1]);
    }
  }));

  socket.on(eventKeys.REQPLAY, Promise.coroutine(function* () {
    log.info(eventKeys.REQPLAY);

    var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.PLAY, [socket.id]]);
    if(commands) {
      for(var i in commands) {
        yield redisSocket.ping.apply(null, commands[i]);
      }

      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, 'issued play.']);
      yield chatEngine.broadcast(chatEngine.Enum.EVENT, response);
    }
  }));

  socket.on(eventKeys.REQPAUSE, Promise.coroutine(function* () {
    log.debug(eventKeys.REQPAUSE);

    var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.PAUSE, [socket.id]]);
    if(commands) {
      for(var i in commands) {
        yield redisSocket.ping.apply(null, commands[i]);
      }

      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, 'issued pause.']);
      yield chatEngine.broadcast(chatEngine.Enum.EVENT, response);
    }
  }));

  socket.on(eventKeys.REQSEEK, Promise.coroutine(function* (data) {
    log.debug(eventKeys.REQSEEK, data);
    var schema = schemaFactory.createDefinition(schemaFactory.Enum.STATE);
    var request = sanitizer.sanitize(data, schema, [schema.Enum.TIMESTAMP]);

    if(request) {
    var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.SEEK, [socket.id, request]]);
      if(commands) {
        for(var i in commands) {
          yield redisSocket.ping.apply(null, commands[i]);
        }

        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, `issued seek to ${request.data}.`]);
        yield chatEngine.broadcast(chatEngine.Enum.EVENT, response);
      }
    }
  }));

  socket.on(eventKeys.SYNC, Promise.coroutine(function* () {
    log.debug(eventKeys.SYNC);

    var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.PAUSESYNC, [socket.id]]);
    if(commands) {
      log.debug(`state-sync onSync ${commands}`);
      for(var i in commands) {
        yield redisSocket.ping.apply(null, commands[i]);
      }

      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, 'issued sync.']);
      yield chatEngine.broadcast(chatEngine.Enum.EVENT, response);
    }
  }));

  socket.on(eventKeys.CHANGESYNCSTATE, Promise.coroutine(function* (data) {
    log.debug(eventKeys.CHANGESYNCSTATE, data);
    var schema = schemaFactory.createDefinition(schemaFactory.Enum.STRING);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

    if(request) {
      var value = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.CHANGESYNCSTATE, [socket.id, request]]);
      if(value) {
        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.CHATRESPONSE, [socket.id, `is now in a sync state ${value}.`]);
        yield chatEngine.broadcast(chatEngine.Enum.EVENT, response);

        if(value === player.Sync.SYNCING) {
          socket.emit('state-trigger-ping', schemaFactory.createPopulatedSchema(schemaFactory.Enum.RESPONSE, [true]));
        } else {
          socket.emit('state-trigger-ping', schemaFactory.createPopulatedSchema(schemaFactory.Enum.RESPONSE, [false]));
        }

        socket.emit('state-sync-state', schemaFactory.createPopulatedSchema(schemaFactory.Enum.RESPONSE, [value]));
      }
    }
  }));

  socket.on(eventKeys.PING, Promise.coroutine(function* (data) {
    log.silly(eventKeys.PING, data);
    var schema = schemaFactory.createDefinition(schemaFactory.Enum.STATE);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

    if(request) {
      var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.SYNCINGPING, [socket.id, request]]);
      if(commands) {
        for(var i in commands) {
          yield redisSocket.ping.apply(null, commands[i]);
        }
      }
    }
  }));

  socket.on(eventKeys.UPDATEINIT, Promise.coroutine(function* (data, acknowledge) {
    log.info(eventKeys.UPDATEINIT);
    if(typeof acknowledge === 'function') {
      acknowledge(null, true);

      var id = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.PLAYERINIT, [socket.id]]);
      if(id) {
        var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.SYNCINGPING, [id]]);
        if(commands) {
          for(var i in commands) {
            yield redisSocket.ping.apply(null, commands[i]);
          }
        }
      }
    }
  }));

  socket.on(eventKeys.UPDATESTATE, Promise.coroutine(function* (data, acknowledge) {
    log.info(eventKeys.UPDATESTATE, data);
    if(typeof acknowledge === 'function') {
      acknowledge(null, true);

      var schema = schemaFactory.createDefinition(schemaFactory.Enum.STATE);
      var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

      if(request) {
        yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.UPDATEPLAYERSYNC, [socket.id, request.timestamp, request.state, request.buffering]]);
      }
    } else {
      throw new Error(`acknowledge is of type ${typeof acknowledge}, it should be a function.`);
    }
  }));
};

module.exports = StateController;
