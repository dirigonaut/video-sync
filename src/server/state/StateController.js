var Validator     = require('../utils/Validator');
var StateEngine   = require('./StateEngine.js');

var validator     = new Validator();
var stateEngine   = new StateEngine();

function StateController(io, socket) {
  initialize(io, socket);
}

module.exports = StateController;

function initialize(io, socket) {
  console.log("Attaching StateController");

  socket.on('state-req-play', function(data) {
    console.log('state-req-play');
    stateEngine.play();
  });

  socket.on('state-req-pause', function(data) {
    console.log('state-req-pause');
    stateEngine.pause();
  });

  socket.on('state-req-seek', function(data) {
    console.log('state-req-seek');
    stateEngine.seek(data)
  });

  socket.on('state-sync', function() {
    console.log('state-sync');
    stateEngine.sync();
  });

  socket.on('state-time-update', function(data) {
    stateEngine.timeUpdate();
  }
}
