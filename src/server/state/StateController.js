var PlayerManager = require('./player/PlayerManager');
var Validator     = require('../utils/Validator');

var playerManager = new PlayerManager();
var validator     = new Validator();

function StateController(io, socket) {
  initialize(io, socket);
}

StateController.prototype.getPlayerManager = function() {
  return playerManager;
};

module.exports = StateController;

function initialize(io, socket) {
  console.log("Attaching StateController");

  socket.on('state-req-play', function(data) {
    console.log('state-req-play');
    io.emit('state-play');
  });

  socket.on('state-req-pause', function(data) {
    console.log('state-req-pause');
    io.emit('state-pause');
  });

  socket.on('state-req-seek', function(data) {
    console.log('state-req-seek');
    io.emit('state-seek', data);
  });
}
