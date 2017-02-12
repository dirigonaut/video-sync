var Validator     = require('../authentication/Validator');
var StateEngine   = require('./StateEngine.js');
var PlayerManager = require('../player/PlayerManager');
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

  socket.on('state-req-play', function() {
    log.info('state-req-play');
    var onAllowed = function() {
      var message = chatEngine.buildMessage(socket.id, "issued play");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    stateEngine.play(socket.id, onAllowed);
  });

  socket.on('state-req-pause', function(data) {
    log.info('state-req-pause');
    var onAllowed = function() {
      var message = chatEngine.buildMessage(socket.id, "issued pause");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    stateEngine.pause(socket.id, onAllowed);
  });

  socket.on('state-req-seek', function(data) {
    log.info('state-req-seek');
    var onAllowed = function() {
      var message = chatEngine.buildMessage(socket.id, `issued seek to ${data.seektime}`);
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    stateEngine.seek(data, onAllowed);
  });

  socket.on('state-sync', function() {
    log.info('state-sync');
    var onAllowed = function() {
      var message = chatEngine.buildMessage(socket.id, "issued sync");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
    };

    stateEngine.sync(socket.id, onAllowed);
  });

  socket.on('state-time-update', function(data) {
    stateEngine.timeUpdate(socket.id, data);
  });

  socket.on('state-initialized', function() {
    var player = playerManager.getPlayer(socket.id);
    player.isInit = true;
  });
}
