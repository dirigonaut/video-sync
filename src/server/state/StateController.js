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

    var onPlay = function(ids, event) {
      redisSocket.broadcastToIds(ids, event);
      var message = chatEngine.buildMessage(socket.id, "issued play");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    publisher.publish(Publisher.Enum.STATE, ['play', [socket.id]], onPlay);
  });

  socket.on('state-req-pause', function(data) {
    log.debug('state-req-pause', data);

    var onPause = function(ids, event, data) {
      redisSocket.broadcastToIds(ids, event, data);
      var message = chatEngine.buildMessage(socket.id, "issued pause");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    publisher.publish(Publisher.Enum.STATE, ['pause', [socket.id]], onPause);
  });

  socket.on('state-req-seek', function(data) {
    log.debug('state-req-seek', data);

    var onSeek = function(ids, event, data) {
      redisSocket.broadcastToIds(ids, event, data);
      var message = chatEngine.buildMessage(socket.id, `issued seek to ${data.seektime}`);
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    publisher.publish(Publisher.Enum.STATE, ['seek', [socket.id, data]], onSeek);
  });

  socket.on('state-sync', function() {
    log.debug('state-sync');

    var onSync = function() {
      redisSocket.broadcastToIds(ids, event, data);
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
    publisher.publish(Publisher.Enum.STATE, ['syncingPing', [socket.id]]);
  });

  socket.on('state-time-update', function(data) {
    log.silly('state-time-update');
    publisher.publish(Publisher.Enum.STATE, ['timeUpdate', [socket.id, data]]);
  });

  socket.on('state-update-init', function(data) {
    log.silly('state-update-init');
    publisher.publish(Publisher.Enum.STATE, ['playerInit', [data.id]]);
  });

  socket.on('state-update-state', function(data) {
    log.silly('state-update-state');
    publisher.publish(Publisher.Enum.STATE, ['updatePlayerState', [data.id, data.timestamp, data.state]]);
  });

  socket.on('state-update-sync', function(data) {
    log.silly('state-update-sync');
    publisher.publish(Publisher.Enum.STATE, ['updatePlayerSync', [data.id, data.timestamp, data.state]]);
  });
}
