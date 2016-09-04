var PlayerManager = require('./player/PlayerManager');
var Session       = require('../utils/Session');

var PlayRule      = require('./rules/PlayRule.js');
var SyncRule      = require('./rules/SyncRule.js');

var playerManager = new PlayerManager();
var session       = new Session();

function StateEngine() {

}

StateEngine.prototype.play = function() {
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
};

StateEngine.prototype.pause = function() {
  if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
    for(var player of playerManager.getPlayers()) {
      player[1].socket.emit('state-pause', updatePlayerState);
    }
  }
};

StateEngine.prototype.seek = function(data) {
  if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
    for(var player of playerManager.getPlayers()) {
      player[1].socket.emit('state-seek', data, updatePlayerState);
    }
  }
};

StateEngine.prototype.sync = function(data) {
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
};

StateEngine.prototype.timeUpdate = function() {
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

module.exports = StateEngine;

var updatePlayerState = function(id, timestamp, state) {
  var player = playerManager.getPlayer(id);

  if(player !== null && player !== undefined) {
    player.state      = state;
    player.timestamp  = timestamp;
  } else {
    console.log("Id: " + id);
    console.log(playerManager.getPlayers());
  }
}
