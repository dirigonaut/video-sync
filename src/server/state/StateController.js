const Promise  = require('bluebird');
const Util     = require('util');

var validator, chatEngine, redisSocket, publisher;

function StateController() { }

StateController.prototype.initialize = Promise.coroutine(function* (io, socket) {}
  if(typeof StateController.prototype.lazyInit === 'undefined') {
    validator   = yield this.factory.createValidator();
    chatEngine  = yield this.factory.createChatEngine();
    redisSocket = yield this.factory.createRedisSocket();
    publisher   = yield this.factory.createRedisPublisher();
    StateController.prototype.lazyInit = true;
  }

  initialize.call(this, io, socket);
});

module.exports = StateController;

function initialize(io, socket) {
  this.log.info("Attaching StateController");
  socket.emit('state-trigger-ping', true);

  socket.on('state-req-init', Promise.coroutine(function*() {
    this.log.debug('state-req-init');
    var payload = yield publisher.publishAsync(Publisher.Enum.STATE, ['initPlayer', [socket.id]]);
    if(payload) {
      socket.emit(payload[1]);
    }
  }.bind(this)));

  socket.on('state-req-play', Promise.coroutine(function* () {
    this.log.info('state-req-play');

    var commands = yield publisher.publishAsync(Publisher.Enum.STATE, ['play', [socket.id]]);
    if(commands) {
      for(var i in commands) {
        redisSocket.ping.apply(null, commands[i]);
      }

      var message = chatEngine.buildMessage(socket.id, "issued play");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    }
  }.bind(this)));

  socket.on('state-req-pause', Promise.coroutine(function* (data) {
    this.log.debug('state-req-pause', data);

    var commands = yeild publisher.publishAsync(Publisher.Enum.STATE, ['pause', [socket.id]]);
    if(commands) {
      for(var i in commands) {
        redisSocket.ping.apply(null, commands[i]);
      }

      var message = chatEngine.buildMessage(socket.id, "issued pause");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    }
  }.bind(this)));

  socket.on('state-req-seek', Promise.coroutine(function* (data) {
    this.log.debug('state-req-seek', data);

    var commands = yield publisher.publishAsync(Publisher.Enum.STATE, ['seek', [socket.id, data]]);
    if(commands) {
      for(var i in commands) {
        redisSocket.ping.apply(null, commands[i]);
      }

      var message = chatEngine.buildMessage(socket.id, `issued seek to ${data.seekTime}`);
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    }
  }.bind(this)));

  socket.on('state-sync', Promise.coroutine(function* () {
    this.log.debug('state-sync');

    var commands = yield publisher.publishAsync(Publisher.Enum.STATE, ['pauseSync', [socket.id]]);
    if(commands) {
      this.log.debug(`state-sync onSync ${commands}`);
      for(var i in commands) {
        redisSocket.ping.apply(null, commands[i]);
      }

      var message = chatEngine.buildMessage(socket.id, "issued sync");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    }
  }.bind(this)));

  socket.on('state-change-sync', Promise.coroutine(function* (data) {
    this.log.debug('state-change-sync', data);

    var value = yield publisher.publishAsync(Publisher.Enum.STATE, ['changeSyncState', [socket.id, data]]);
    if(value) {
      var message = chatEngine.buildMessage(socket.id, `is now in sync state ${value}`);
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);

      if(value === Player.Sync.SYNCING) {
        socket.emit('state-trigger-ping', true);
      } else {
        socket.emit('state-trigger-ping', false);
      }

      socket.emit('state-sync-state', value);
    }
  }.bind(this)));

  socket.on('state-sync-ping', Promise.coroutine(function* () {
    this.log.silly('state-sync-ping');

    var commands = yield publisher.publishAsync(Publisher.Enum.STATE, ['syncingPing', [socket.id]]);
    if(commands) {
      for(var i in commands) {
        redisSocket.ping.apply(null, commands[i]);
      }
    }
  }.bind(this)));

  socket.on('state-time-update', Promise.coroutine(function* (data) {
    this.log.silly('state-time-update', data);

    var commands = yield publisher.publishAsync(Publisher.Enum.STATE, ['syncingPing', [socket.id, data]]);
    if(commands) {
      for(var i in commands) {
        redisSocket.ping.apply(null, commands[i]);
      }
    }
  }.bind(this)));

  socket.on('state-update-init', Promise.coroutine(function* (data, acknowledge) {
    this.log.info(`state-update-init`, data);
    acknowledge(null, true);

    var id = yield publisher.publishAsync(Publisher.Enum.STATE, ['playerInit', [data.id]]);
    if(id) {
      var commands = yield publisher.publishAsync(Publisher.Enum.STATE, ['syncingPing', [id]]);
      if(commands) {
        for(var i in commands) {
          redisSocket.ping.apply(null, commands[i]);
        }
      }
    }
  }.bind(this)));

  socket.on('state-update-state', Promise.coroutine(function* (data, acknowledge) {
    this.log.info('state-update-state', data);
    acknowledge(null, true);
    yield publisher.publishAsync(Publisher.Enum.STATE, ['updatePlayerState', [data.id, data.timestamp, data.state]]);
  }.bind(this)));

  socket.on('state-update-sync', Promise.coroutine(function* (data, acknowledge) {
    this.log.info('state-update-sync', data);
    acknowledge(null, true);
    yield publisher.publishAsync(Publisher.Enum.STATE, ['updatePlayerSync', [data.id, data.timestamp, data.state]]);
  }.bind(this)));
}
