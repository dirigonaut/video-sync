const Promise  = require("bluebird");

var media, schemaFactory, sanitizer, redisSocket, publisher, stateEngine, eventKeys, credentials, log;

function StateController() { }

StateController.prototype.initialize = function() {
  if(typeof StateController.prototype.protoInit === "undefined") {
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
  }
};

StateController.prototype.attachSocket = function(socket) {
  log.info("StateController.attachSocket");

  socket.on(eventKeys.REQPLAY, Promise.coroutine(function* () {
    log.info(eventKeys.REQPLAY);
    var access = yield credentials.getTokenLevel(socket.id);

    if(access === credentials.Enums.LEVEL.CONTROLS) {
      var commands = yield publisher.publishAsync(publisher.Enums.KEY.STATE, [stateEngine.Functions.PLAY]);

      if(commands) {
        for(var i = 0; i < commands.length; ++i) {
          yield redisSocket.ping.apply(StateController.prototype, commands[i]);
        }

        var handle = yield credentials.getHandle(socket);
        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.LOGRESPONSE,
          [new Date().toLocaleTimeString(), "notify", "state", `${handle} issued play.`]);
        yield redisSocket.broadcast.call(StateController.prototype, eventKeys.NOTIFICATION, response);
      }
    }
  }));

  socket.on(eventKeys.REQPAUSE, Promise.coroutine(function* () {
    log.debug(eventKeys.REQPAUSE);
    var access = yield credentials.getTokenLevel(socket.id);

    if(access === credentials.Enums.LEVEL.CONTROLS) {
      var commands = yield publisher.publishAsync(publisher.Enums.KEY.STATE, [stateEngine.Functions.PAUSE]);
      if(commands) {
        for(var i = 0; i < commands.length; ++i) {
          yield redisSocket.ping.apply(StateController.prototype, commands[i]);
        }

        var handle = yield credentials.getHandle(socket);
        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.LOGRESPONSE,
          [new Date().toLocaleTimeString(), "notify", "state", `${handle} issued pause.`]);
        yield redisSocket.broadcast.call(StateController.prototype, eventKeys.NOTIFICATION, response);
      }
    }
  }));

  socket.on(eventKeys.REQSEEK, Promise.coroutine(function* (data) {
    log.debug(eventKeys.REQSEEK, data);
    var access = yield credentials.getTokenLevel(socket.id);

    if(access === credentials.Enums.LEVEL.CONTROLS) {
      var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.STATE);
      var request = sanitizer.sanitize(data, schema, [schema.Enum.TIMESTAMP], socket);

      if(request) {
        var commands = yield publisher.publishAsync(publisher.Enums.KEY.STATE, [stateEngine.Functions.SEEK, [request]]);

        if(commands) {
          for(var i = 0; i < commands.length; ++i) {
            yield redisSocket.ping.apply(StateController.prototype, commands[i]);
          }

          var handle = yield credentials.getHandle(socket);
          var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.LOGRESPONSE,
            [new Date().toLocaleTimeString(), "notify", "state", `${handle} issued seek to ${request.timestamp}.`]);
          yield redisSocket.broadcast.call(StateController.prototype, eventKeys.NOTIFICATION, response);
        }
      }
    }
  }));

  socket.on(eventKeys.SYNC, Promise.coroutine(function* () {
    log.debug(eventKeys.SYNC);
    var command = yield publisher.publishAsync(publisher.Enums.KEY.STATE, [stateEngine.Functions.SYNC]);

    if(command.length) {
      log.debug(`state-sync sync`, command);
      yield redisSocket.broadcast.apply(StateController.prototype, command.shift());
    }
  }));

  socket.on(eventKeys.SYNCING, Promise.coroutine(function* () {
    log.debug(eventKeys.SYNCING);
    yield publisher.publishAsync(publisher.Enums.KEY.STATE, [stateEngine.Functions.SYNCING, [socket.id]]);

    var handle = yield credentials.getHandle(socket);
    var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.LOGRESPONSE,
      [new Date().toLocaleTimeString(), "notify", "state", `${handle} is syncing.`]);
    yield redisSocket.broadcast.call(StateController.prototype, eventKeys.NOTIFICATION, response);
  }));

  socket.on(eventKeys.SYNCINGALL, Promise.coroutine(function* () {
    log.debug(eventKeys.SYNCINGALL);
    yield publisher.publishAsync(publisher.Enums.KEY.STATE, [stateEngine.Functions.SYNCINGALL]);

    var handle = yield credentials.getHandle(socket);
    var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.LOGRESPONSE,
      [new Date().toLocaleTimeString(), "notify", "state", `${handle} issued a sync all.`]);

    yield redisSocket.broadcast.call(StateController.prototype, eventKeys.NOTIFICATION, response);
  }));

  socket.on(eventKeys.PING, Promise.coroutine(function* (data, acknowledge) {
    log.silly(eventKeys.PING, data);

    if(typeof acknowledge === "function") {
      acknowledge(null, true);
    }

    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.STATE);
    var request = sanitizer.sanitize(data, schema, [schema.Enum.TIMESTAMP], socket);

    if(request) {
      var commands = yield publisher.publishAsync(publisher.Enums.KEY.STATE, [stateEngine.Functions.SYNCINGPING, [socket.id, request]]);

      if(commands) {
        for(var i = 0; i < commands.length; ++i) {
          log.debug("Ping command", commands[i]);
          yield redisSocket.ping.apply(StateController.prototype, commands[i]);
        }
      }
    }
  }));
};

module.exports = StateController;
