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

module.exports = StateController;

function initialize(io, socket) {
  console.log("Attaching StateController");

  socket.on('state-req-play', function(data) {
    console.log('state-req-play');
    if(session.getMediaPath() != null && session.getMediaPath().length > 0) {

      var player = playerManager.getPlayer(socket.id);
      player.timestamp = data.time;

      var broadcastEvent = function() {
        for(var player of playerManager.getPlayers()) {
          player[1].socket.emit('state-play', updatePlayerState);
        }
      }

      new PlayRule(2).evaluate(player, broadcastEvent);
    }
  });

  socket.on('state-req-pause', function(data) {
    console.log('state-req-pause');
    if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
      for(var player of playerManager.getPlayers()) {
        player[1].socket.emit('state-pause', updatePlayerState);
      }
    }
  });

  socket.on('state-req-seek', function(data) {
    console.log('state-req-seek');
    if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
      for(var player of playerManager.getPlayers()) {
        player[1].socket.emit('state-seek', data, updatePlayerState);
      }
    }
  });

  socket.on('state-sync', function() {
    console.log('state-sync');
    if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
      if(playerManager.getPlayers().size > 1) {
        var syncTime = null;

        for(var player of playerManager.getPlayers()) {
          if(syncTime == null || syncTime > player[1].timestamp) {
            syncTime = player[1].timestamp;
          }
        }

        var request = new Object();
        request.seektime = syncTime;

        socket.emit('state-seek', request, updatePlayerState);
      }
    }
  });

  socket.on('state-time-update', function(data) {
    if(session.getMediaPath() != null && session.getMediaPath().length > 0) {

      var player = playerManager.getPlayer(socket.id);
      player.timestamp = data.timestamp;

      var broadcastEvent = function(players, event) {
        for(var player of players) {
          player[1].socket.emit(event, updatePlayerState);
        }
      }

      if(playerManager.getPlayers().size > 1) {
        new SyncRule(2).evaluate(player, broadcastEvent);
      }
    }
  });
}

var updatePlayerState = function(id, timestamp, state) {
  var player = playerManager.getPlayer(id);

  if(player === null || player === undefined) {
    player = playerManager.getPlayer("/#" + id);
  }

  if(player !== null && player !== undefined) {
    player.state      = state;
    player.timestamp  = timestamp;
  } else {
    console.log("Id: " + id);
    console.log(playerManager.getPlayers());
  }
}
