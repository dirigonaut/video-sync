var Validator     = require('../authentication/Validator');
var StateEngine   = require('./StateEngine.js');
var Log           = require('../utils/Logger')
var PlayerManager = require('./player/PlayerManager');

var playerManager = new PlayerManager();
var validator     = new Validator();
var stateEngine   = new StateEngine();;

function StateController(io, socket) {
  initialize(io, socket);
}

module.exports = StateController;

function initialize(io, socket) {
  console.log("Attaching StateController");

  socket.on('state-req-play', function(data) {
    console.log('state-req-play');
    stateEngine.play(socket.id, data);
  });

  socket.on('state-req-pause', function(data) {
    console.log('state-req-pause');
    stateEngine.pause(socket);
  });

  socket.on('state-req-seek', function(data) {
    console.log('state-req-seek');
    stateEngine.seek(data)
  });

  socket.on('state-sync', function() {
    console.log('state-sync');
    stateEngine.sync(socket);
  });

  socket.on('state-time-update', function(data) {
    stateEngine.timeUpdate(socket.id, data);
  });

  socket.on('state-initialized', function() {
    var player = playerManager.getPlayer(socket.id);
    player.isInit = true;
  });
}
