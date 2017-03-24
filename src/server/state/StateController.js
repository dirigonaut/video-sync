var Validator     = require('../authentication/Validator');
var StateEngine   = require('./StateEngine.js');
var PlayerManager = require('../player/PlayerManager');
var Player        = require('../player/Player');
var ChatEngine    = require('../chat/ChatEngine');
var LogManager    = require('../log/LogManager');

var playerManager = new PlayerManager();
var validator     = new Validator();
var stateEngine   = new StateEngine();
var chatEngine    = new ChatEngine();

var log = LogManager.getLog(LogManager.LogEnum.STATE);

function StateController(io, socket) {
  initialize(io, socket);
}

module.exports = StateController;

function initialize(io, socket) {
  log.info("Attaching StateController");
  socket.emit('state-trigger-ping', true);

  socket.on('state-req-init', function() {
    log.debug('state-req-init');
    stateEngine.init(socket.id);
  });
  
  socket.on('state-req-play', function() {
    log.info('state-req-play');
    var onAllowed = function() {
      var message = chatEngine.buildMessage(socket.id, "issued play");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    stateEngine.play(socket.id, onAllowed);
  });

  socket.on('state-req-pause', function(data) {
    log.debug('state-req-pause', data);
    var onAllowed = function() {
      var message = chatEngine.buildMessage(socket.id, "issued pause");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    stateEngine.pause(socket.id, onAllowed);
  });

  socket.on('state-req-seek', function(data) {
    log.debug('state-req-seek', data);
    var onAllowed = function() {
      var message = chatEngine.buildMessage(socket.id, `issued seek to ${data.seektime}`);
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    stateEngine.seek(socket.id, data, onAllowed);
  });

  socket.on('state-sync', function() {
    log.debug('state-sync');
    var onAllowed = function() {
      var message = chatEngine.buildMessage(socket.id, "issued sync");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    stateEngine.pauseSync(socket.id, onAllowed);
  });

  socket.on('state-change-sync', function(data) {
    log.debug('state-change-sync', data);
    var onAllowed = function(value) {
      var message = chatEngine.buildMessage(socket.id, `is now in sync state ${value}`);
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);

      if(value === Player.Sync.SYNCING) {
        socket.emit('state-trigger-ping', true);
      }

      socket.emit('state-sync-state', value);
    };

    stateEngine.changeSyncState(socket.id, data, onAllowed);
  });

  socket.on('state-sync-ping', function() {
    log.silly('state-sync-ping');
    stateEngine.syncingPing(socket.id);
  });

  socket.on('state-time-update', function(data) {
    log.silly('state-time-update');
    stateEngine.timeUpdate(socket.id, data);
  });
}
