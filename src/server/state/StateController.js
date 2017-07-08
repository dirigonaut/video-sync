const Promise  = require('bluebird');

var player, schemaFactory, sanitizer, chatEngine, redisSocket, publisher, stateEngine, log;

function StateController() { }

StateController.prototype.initialize = function(force) {
  if(typeof StateController.prototype.protoInit === 'undefined') {
    StateController.prototype.protoInit = true;
    player          = this.factory.createPlayer();
    schemaFactory   = this.factory.createSchemaFactory();
    sanitizer       = this.factory.createSanitizer();
    chatEngine      = this.factory.createChatEngine();
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
  socket.emit('state-trigger-ping', schemaFactory.createPopulatedSchema(schemaFactory.Enum.RESPONSE, [true]));

  socket.on('state-req-init', Promise.coroutine(function*() {
    log.debug('state-req-init');
    var command = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.INITPLAYER, [socket.id]]);
    if(command) {
      socket.emit(schemaFactory.createPopulatedSchema(schemaFactory.Enum.RESPONSE, [command[1]]));
    }
  }));

  socket.on('state-req-play', Promise.coroutine(function* () {
    log.info('state-req-play');

    var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.PLAY, [socket.id]]);
    if(commands) {
      for(var i in commands) {
        yield redisSocket.ping.apply(null, commands[i]);
      }

      var message = chatEngine.buildMessage(socket.id, "issued play");
      yield chatEngine.broadcast(chatEngine.Enum.EVENT, message);
    }
  }));

  socket.on('state-req-pause', Promise.coroutine(function* () {
    log.debug('state-req-pause');

    var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.PAUSE, [socket.id]]);
    if(commands) {
      for(var i in commands) {
        yield redisSocket.ping.apply(null, commands[i]);
      }

      var message = chatEngine.buildMessage(socket.id, "issued pause");
      yield chatEngine.broadcast(chatEngine.Enum.EVENT, message);
    }
  }));

  socket.on('state-req-seek', Promise.coroutine(function* (data) {
    log.debug('state-req-seek', data);
    var schema = schemaFactory.createDefinition(schemaFactory.Enum.NUMBER);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

    if(request) {
    var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.SEEK, [socket.id, request]]);
      if(commands) {
        for(var i in commands) {
          yield redisSocket.ping.apply(null, commands[i]);
        }

        var message = chatEngine.buildMessage(socket.id, `issued seek to ${request.data}`);
        yield chatEngine.broadcast(chatEngine.Enum.EVENT, message);
      }
    }
  }));

  socket.on('state-sync', Promise.coroutine(function* () {
    log.debug('state-sync');

    var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.PAUSESYNC, [socket.id]]);
    if(commands) {
      log.debug(`state-sync onSync ${commands}`);
      for(var i in commands) {
        yield redisSocket.ping.apply(null, commands[i]);
      }

      var message = chatEngine.buildMessage(socket.id, "issued sync");
      yield chatEngine.broadcast(chatEngine.Enum.EVENT, message);
    }
  }));

  socket.on('state-change-sync', Promise.coroutine(function* (data) {
    log.debug('state-change-sync', data);
    var schema = schemaFactory.createDefinition(schemaFactory.Enum.STRING);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

    if(request) {
      var value = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.CHANGESYNCSTATE, [socket.id, request]]);
      if(value) {
        var message = chatEngine.buildMessage(socket.id, `is now in sync state ${value}`);
        yield chatEngine.broadcast(chatEngine.Enum.EVENT, message);

        if(value === player.Sync.SYNCING) {
          socket.emit('state-trigger-ping', schemaFactory.createPopulatedSchema(schemaFactory.Enum.RESPONSE, [true]));
        } else {
          socket.emit('state-trigger-ping', schemaFactory.createPopulatedSchema(schemaFactory.Enum.RESPONSE, [false]));
        }

        socket.emit('state-sync-state', schemaFactory.createPopulatedSchema(schemaFactory.Enum.RESPONSE, [value]));
      }
    }
  }));

  socket.on('state-sync-ping', Promise.coroutine(function* (data) {
    log.silly('state-sync-ping');
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

  socket.on('state-time-update', Promise.coroutine(function* (data) {
    log.silly('state-time-update', data);
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

  socket.on('state-update-init', Promise.coroutine(function* (data, acknowledge) {
    log.info(`state-update-init`);
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

  socket.on('state-update-state', Promise.coroutine(function* (data, acknowledge) {
    log.info('state-update-state', data);
    if(typeof acknowledge === 'function') {
      acknowledge(null, true);

      var schema = schemaFactory.createDefinition(schemaFactory.Enum.STATE);
      var request = sanitizer.sanitize(data, schema, [schema.Enum.TIMESTAMP, schema.Enum.STATE]);

      if(request) {
        yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.UPDATEPLAYERSTATE, [socket.id, request.timestamp, request.state]]);
      }
    } else {
      throw new Error(`acknowledge is of type ${typeof acknowledge}, it should be a function.`);
    }
  }));

  socket.on('state-update-sync', Promise.coroutine(function* (data, acknowledge) {
    log.info('state-update-sync', data);
    if(typeof acknowledge === 'function') {
      acknowledge(null, true);

      var schema = schemaFactory.createDefinition(schemaFactory.Enum.STATE);
      var request = sanitizer.sanitize(data, schema, [schema.Enum.TIMESTAMP, schema.Enum.STATE]);

      if(request) {
        yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.UPDATEPLAYERSYNC, [socket.id, request.timestamp, request.state]]);
      }
    } else {
      throw new Error(`acknowledge is of type ${typeof acknowledge}, it should be a function.`);
    }
  }));
};

module.exports = StateController;
