var PlayerManager = require('./player/PlayerManager');

var playerManager = new PlayerManager();

function StateController(io, socket, val_util) {

  initialize(io, socket);
}

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
}

module.exports = StateController;
