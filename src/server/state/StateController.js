const Promise  = require('bluebird');
const Util     = require('util');

var player, validator, chatEngine, redisSocket, publisher, stateEngine, log;

function StateController() { }

StateController.prototype.initialize = function(force) {
  if(typeof StateController.prototype.protoInit === 'undefined') {
    StateController.prototype.protoInit = true;
    player          = this.factory.createPlayer();
    validator       = this.factory.createValidator();
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
  socket.emit('state-trigger-ping', true);

  socket.on('state-req-init', Promise.coroutine(function*() {
    log.debug('state-req-init');
    var payload = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.INITPLAYER, [socket.id]]);
    if(payload) {
      socket.emit(payload[1]);
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

  socket.on('state-req-pause', Promise.coroutine(function* (data) {
    log.debug('state-req-pause', data);

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

    var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.SEEK, [socket.id, data]]);
    if(commands) {
      for(var i in commands) {
        yield redisSocket.ping.apply(null, commands[i]);
      }

      var message = chatEngine.buildMessage(socket.id, `issued seek to ${data.seekTime}`);
      yield chatEngine.broadcast(chatEngine.Enum.EVENT, message);
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

    var value = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.CHANGESYNCSTATE, [socket.id, data]]);
    if(value) {
      var message = chatEngine.buildMessage(socket.id, `is now in sync state ${value}`);
      yield chatEngine.broadcast(chatEngine.Enum.EVENT, message);

      if(value === player.Sync.SYNCING) {
        socket.emit('state-trigger-ping', true);
      } else {
        socket.emit('state-trigger-ping', false);
      }

      socket.emit('state-sync-state', value);
    }
  }));

  socket.on('state-sync-ping', Promise.coroutine(function* () {
    log.silly('state-sync-ping');

    var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.SYNCINGPING, [socket.id]]);
    if(commands) {
      for(var i in commands) {
        yield redisSocket.ping.apply(null, commands[i]);
      }
    }
  }));

  socket.on('state-time-update', Promise.coroutine(function* (data) {
    log.silly('state-time-update', data);

    var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.SYNCINGPING, [socket.id, data]]);
    if(commands) {
      for(var i in commands) {
        yield redisSocket.ping.apply(null, commands[i]);
      }
    }
  }));

  socket.on('state-update-init', Promise.coroutine(function* (data, acknowledge) {
    log.info(`state-update-init`, data);
    acknowledge(null, true);

    var id = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.PLAYERINIT, [data.id]]);
    if(id) {
      var commands = yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.SYNCINGPING, [id]]);
      if(commands) {
        for(var i in commands) {
          yield redisSocket.ping.apply(null, commands[i]);
        }
      }
    }
  }));

  socket.on('state-update-state', Promise.coroutine(function* (data, acknowledge) {
    log.info('state-update-state', data);
    acknowledge(null, true);
    yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.UPDATEPLAYERSTATE, [data.id, data.timestamp, data.state]]);
  }));

  socket.on('state-update-sync', Promise.coroutine(function* (data, acknowledge) {
    log.info('state-update-sync', data);
    acknowledge(null, true);
    yield publisher.publishAsync(publisher.Enum.STATE, [stateEngine.functions.UPDATEPLAYERSYNC, [data.id, data.timestamp, data.state]]);
  }));
};

module.exports = StateController;
