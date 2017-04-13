var Validator     = require('../authentication/Validator');
var Player        = require('../player/Player');
var ChatEngine    = require('../chat/ChatEngine');
var RedisSocket   = require('../process/redis/RedisSocket');
var Publisher     = require('../process/redis/RedisPublisher');
var LogManager    = require('../log/LogManager');

var log = LogManager.getLog(LogManager.LogEnum.STATE);
var validator     = new Validator();
var chatEngine    = new ChatEngine();
var redisSocket   = new RedisSocket();
var publisher     = new Publisher();

function StateController(io, socket) {
  initialize(io, socket);
}

module.exports = StateController;

function initialize(io, socket) {
  log.info("Attaching StateController");
  socket.emit('state-trigger-ping', true);

  socket.on('state-req-init', function() {
    log.debug('state-req-init');
    var onInit = function(id, event) {
      socket.emit(event);
    };

    publisher.publish(Publisher.Enum.STATE, ['init', [socket.id]], onInit);
  });

  socket.on('state-req-play', function() {
    log.info('state-req-play');

    var onPlay = function(commands) {
      for(var i in commands) {
        redisSocket.broadcastToId.apply(null, commands[i]);
      }

      var message = chatEngine.buildMessage(socket.id, "issued play");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    publisher.publish(Publisher.Enum.STATE, ['play', [socket.id]], onPlay);
  });

  socket.on('state-req-pause', function(data) {
    log.debug('state-req-pause', data);

    var onPause = function(commands) {
      for(var i in commands) {
        redisSocket.broadcastToId.apply(null, commands[i]);
      }

      var message = chatEngine.buildMessage(socket.id, "issued pause");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    publisher.publish(Publisher.Enum.STATE, ['pause', [socket.id]], onPause);
  });

  socket.on('state-req-seek', function(data) {
    log.debug('state-req-seek', data);

    var onSeek = function(commands) {
      for(var i in commands) {
        redisSocket.broadcastToId.apply(null, commands[i]);
      }

      var message = chatEngine.buildMessage(socket.id, `issued seek to ${data.seekTime}`);
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    publisher.publish(Publisher.Enum.STATE, ['seek', [socket.id, data]], onSeek);
  });

  socket.on('state-sync', function() {
    log.debug('state-sync');

    var onSync = function(commands) {
      log.debug(`state-sync onSync ${commands}`);
      for(var i in commands) {
        redisSocket.broadcastToId.apply(null, commands[i]);
      }

      var message = chatEngine.buildMessage(socket.id, "issued sync");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    publisher.publish(Publisher.Enum.STATE, ['pauseSync', [socket.id]], onSync);
  });

  socket.on('state-change-sync', function(data) {
    log.debug('state-change-sync', data);

    var onChangeSync = function(value) {
      var message = chatEngine.buildMessage(socket.id, `is now in sync state ${value}`);
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);

      if(value === Player.Sync.SYNCING) {
        socket.emit('state-trigger-ping', true);
      }

      socket.emit('state-sync-state', value);
    };

    publisher.publish(Publisher.Enum.STATE, ['changeSyncState', [socket.id, data]], onChangeSync);
  });

  socket.on('state-sync-ping', function() {
    log.silly('state-sync-ping');

    var onSync = function(commands) {
      for(var i in commands) {
        redisSocket.broadcastToId.apply(null, commands[i]);
      }
    };

    publisher.publish(Publisher.Enum.STATE, ['syncingPing', [socket.id]], onSync);
  });

  socket.on('state-time-update', function(data) {
    log.silly('state-time-update', data);

    var onTime = function(commands) {
      for(var i in commands) {
        redisSocket.broadcastToId.apply(null, commands[i]);
      }
    };

    publisher.publish(Publisher.Enum.STATE, ['timeUpdate', [socket.id, data]], onTime);
  });

  socket.on('state-update-init', function(data) {
    log.info(`state-update-init`, data);

    var onInit = function(id) {
      var onSync = function(commands) {
        for(var i in commands) {
          redisSocket.broadcastToId.apply(null, commands[i]);
        }
      };

      publisher.publish(Publisher.Enum.STATE, ['syncingPing', [id]], onSync);
    }

    publisher.publish(Publisher.Enum.STATE, ['playerInit', [data.id]], onInit);
  });

  socket.on('state-update-state', function(data) {
    log.info('state-update-state', data);
    publisher.publish(Publisher.Enum.STATE, ['updatePlayerState', [data.id, data.timestamp, data.state]]);
  });

  socket.on('state-update-sync', function(data) {
    log.info('state-update-sync', data);
    publisher.publish(Publisher.Enum.STATE, ['updatePlayerSync', [data.id, data.timestamp, data.state]]);
  });
}
