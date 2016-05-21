var PlayerManager = require('./player/PlayerManager');
var Validator     = require('../utils/Validator');
var Session       = require('../utils/Session');

var PlayRule      = require('./rules/PlayRule.js');
var SyncRule      = require('./rules/SyncRule.js');

var playerManager = new PlayerManager();
var validator     = new Validator();
var session       = new Session();

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
    if(session.getMediaPath() != null && session.getMediaPath().length > 0) {

      var player = playerManager.getPlayer(socket.id);
      player.timestamp = data.time;

      var broadcastEvent = function() {
        io.emit('state-play', updatePlayerState);
      }

      new PlayRule(2).evaluate(player, broadcastEvent);
    }
  });

  socket.on('state-req-pause', function(data) {
    console.log('state-req-pause');
    io.emit('state-pause');
  });

  socket.on('state-req-seek', function(data) {
    console.log('state-req-seek');
    if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
      io.emit('state-seek', data, updatePlayerState);
    }
  });

  socket.on('state-req-join', function(data) {
    console.log('state-req-join');
    socket.emit('state-join', data, updatePlayerState);
  });

  socket.on('state-time-update', function(data) {
    console.log('state-time-update');
    if(session.getMediaPath() != null && session.getMediaPath().length > 0) {

      var player = playerManager.getPlayer(socket.id);
      player.timestamp = data.time;

      var broadcastEvent = function(players, event) {
        for(var i in players) {
          players[i].socket.emit(event, updatePlayerState);
        }
      }

      new SyncRule(2).evaluate(player, broadcastEvent);
    }
  });
}

function updatePlayerState(id, state, timestamp) {
  var player        = playerManager.getPlayer(id);
  player.state      = state;
  player.timestamp  = timestamp;
}
