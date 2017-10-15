const Promise  = require('bluebird');

const METRICSINTERVAL = 1000;

var media, schemaFactory, sanitizer, redisSocket, publisher, autoSyncInterval, stateEngine, eventKeys, credentials, log;

function StateController() { }

StateController.prototype.initialize = function() {
  if(typeof StateController.prototype.protoInit === 'undefined') {
    StateController.prototype.protoInit = true;
    credentials     = this.factory.createCredentialManager();
    schemaFactory   = this.factory.createSchemaFactory();
    sanitizer       = this.factory.createSanitizer();
    eventKeys       = this.factory.createKeys();

    publisher       = this.factory.createRedisPublisher();
    redisSocket     = this.factory.createRedisSocket();
    stateEngine     = this.factory.getStateEngineInfo();
    media           = this.factory.createMedia();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.STATE);

    autoMetricsInterval = setInterval(Promise.coroutine(function* () {
      var metrics = yield media.getPlayerMetrics();
      yield redisSocket.broadcast.apply(null, [eventKeys.PLAYERINFO, metrics]);
    }), METRICSINTERVAL);
  }
};

StateController.prototype.attachSocket = function(socket) {
  log.info('StateController.attachSocket');

  socket.on(eventKeys.REQPLAY, Promise.coroutine(function* () {
    log.info(eventKeys.REQPLAY);

    if(credentials.getTokenLevel === credentials.Enums.LEVEL.CONTROLS) {
      var commands = yield publisher.publishAsync(publisher.Enums.KEY.STATE, [stateEngine.functions.PLAY, [socket.id]]);
      if(commands) {
        for(var i = 0; i < commands.length; ++i) {
          yield redisSocket.ping.apply(null, commands[i]);
        }

        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.CHATRESPONSE, [socket.id, 'issued play.']);
        yield redisSocket.broadcast(eventKeys.EVENTRESP, response);
      }
    }
  }));

  socket.on(eventKeys.REQPAUSE, Promise.coroutine(function* () {
    log.debug(eventKeys.REQPAUSE);

    if(credentials.getTokenLevel === credentials.Enums.LEVEL.CONTROLS) {
      var commands = yield publisher.publishAsync(publisher.Enums.KEY.STATE, [stateEngine.functions.PAUSE, [socket.id]]);
      if(commands) {
        for(var i = 0; i < commands.length; ++i) {
          yield redisSocket.ping.apply(null, commands[i]);
        }

        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.CHATRESPONSE, [socket.id, 'issued pause.']);
        yield redisSocket.broadcast(eventKeys.EVENTRESP, response);
      }
    }
  }));

  socket.on(eventKeys.REQSEEK, Promise.coroutine(function* (data) {
    log.debug(eventKeys.REQSEEK, data);

    if(credentials.getTokenLevel === credentials.Enums.LEVEL.CONTROLS) {
      var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.STATE);
      var request = sanitizer.sanitize(data, schema, [schema.Enum.TIMESTAMP], socket);

      if(request) {
        var commands = yield publisher.publishAsync(publisher.Enums.KEY.STATE, [stateEngine.functions.SEEK, [socket.id, request]]);

        if(commands) {
          for(var i = 0; i < commands.length; ++i) {
            yield redisSocket.ping.apply(null, commands[i]);
          }

          var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.CHATRESPONSE, [socket.id, `issued seek to ${request.timestamp}.`]);
          yield redisSocket.broadcast(eventKeys.EVENTRESP, response);
        }
      }
    }
  }));

  socket.on(eventKeys.SYNC, Promise.coroutine(function* () {
    log.debug(eventKeys.SYNC);
    var commands = yield publisher.publishAsync(publisher.Enum.KEY.STATE, [stateEngine.functions.SYNC, [socket.id]]);

    if(commands) {
      for(var i = 0; i < commands.length; ++i) {
        log.debug(`state-sync sync`, commands[i]);
        yield redisSocket.ping.apply(null, commands[i]);
      }

      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.CHATRESPONSE, [socket.id, 'issued sync.']);
      yield redisSocket.broadcast(eventKeys.EVENTRESP, response);
    }
  }));

  socket.on(eventKeys.PING, Promise.coroutine(function* (data, acknowledge) {
    log.silly(eventKeys.PING, data);

    if(typeof acknowledge === 'function') {
      acknowledge(null, true);
    }

    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.STATE);
    var request = sanitizer.sanitize(data, schema, [schema.Enum.TIMESTAMP], socket);

    if(request) {
      var commands = yield publisher.publishAsync(publisher.Enum.KEY.STATE, [stateEngine.functions.SYNCINGPING, [socket.id, request]]);

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
