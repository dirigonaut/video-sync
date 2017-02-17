var PlayerManager = require('../player/PlayerManager');
var Session       = require('../administration/Session');
var PlayRule      = require('./rules/PlayRule.js');
var SyncRule      = require('./rules/SyncRule.js');
var SyncingRule   = require('./rules/SyncingRule.js');
var ResumeRule    = require('./rules/ResumeRule.js');
var Player        = require('../player/Player');
var LogManager    = require('../log/LogManager');

var playerManager = new PlayerManager();
var session       = new Session();
var accuracy      = 2;
var log;

function StateEngine() {
  log = LogManager.getLog(LogManager.LogEnum.STATE);
}

StateEngine.prototype.play = function(id, callback) {
  log.info('StateEngine.play');
  if(session.getMediaPath() !== null && session.getMediaPath().length > 0) {
    var player = playerManager.getPlayer(id);

    if(player.sync === Player.Sync.DESYNCED) {
      player.socket.emit('state-play', updatePlayerState);
    } else {
      var broadcastEvent = function(players) {
        for(var i in players) {
          if(players[i].sync !== Player.Sync.DESYNCED) {
            players[i].socket.emit('state-play', updatePlayerState);

            if(session.getMediaStarted() === false && players[i].isInit()) {
              players[i].sync = Player.Sync.SYNCED;
            }
          }
        }

        session.mediaStarted();

        if(callback !== undefined && callback !== null) {
          callback();
        }
      }

      new PlayRule(accuracy).evaluate(player, broadcastEvent);
    }
  }
};

StateEngine.prototype.pause = function(id, callback) {
  log.info('StateEngine.pause');
  if(session.getMediaPath() !== null && session.getMediaPath().length > 0) {
    var player = playerManager.getPlayer(id);

    if(player.sync === Player.Sync.DESYNCED) {
      player.socket.emit('state-pause', updatePlayerState);
    } else {
      for(var player of playerManager.getPlayers()) {
        if(player[1].sync !== Player.Sync.DESYNCED) {
          player[1].sync = Player.Sync.SYNCED;
          player[1].socket.emit('state-pause', updatePlayerState);

          if(callback !== undefined && callback !== null) {
            callback();
          }
        }
      }
    }
  }
};

StateEngine.prototype.seek = function(data, callback) {
  log.info('StateEngine.seek');
  if(session.getMediaPath() !== null && session.getMediaPath().length > 0 && session.getMediaStarted()) {
    if(player.sync === Player.Sync.DESYNCED) {
      var player = playerManager.getPlayer(id);
      player.socket.emit('state-seek', data, updatePlayerState);
    } else {
      for(var player of playerManager.getPlayers()) {
        if(player.sync !== Player.Sync.DESYNCED) {
          player[1].socket.emit('state-seek', data, updatePlayerState);
        }
      }

      if(callback !== undefined && callback !== null) {
        callback();
      }
    }
  }
};

StateEngine.prototype.sync = function(id, callback) {
  log.info('StateEngine.sync');
  if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
    var player = playerManager.getPlayer(id);

    if(player.sync !== Player.Sync.DESYNCED) {
      if(playerManager.getPlayers().size > 1) {
        var syncTime = null;

        for(var player of playerManager.getPlayers().values()) {
          if(syncTime === null || (player.sync === Player.Sync.SYNCED && syncTime > player.timestamp)) {
            syncTime = player.timestamp;
          }
        }

        var response = new Object();
        response.seektime = syncTime;

        var socket = playerManager.getPlayer(id).socket;
        socket.emit('state-seek', response, updatePlayerState);

        if(callback !== undefined && callback !== null) {
          callback();
        }
      }
    }
  }
};

StateEngine.prototype.changeSyncState = function(socket, callback) {
  log.info('StateEngine.changeSyncState');
  if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
    var player = playerManager.getPlayer(socket.id);
    if(player !== null && player !== undefined) {
      if(player.sync === Player.Sync.DESYNCED) {
        player.sync = Player.Sync.SYNCWAIT;
      } else {
        player.sync = Player.Sync.DESYNCED;
      }

      if(callback !== undefined && callback !== null) {
        callback(player.sync);
      }
    }
  }
};

StateEngine.prototype.timeUpdate = function(id, data) {
  log.info(`StateEngine.timeUpdate ${id}`);
  if(session.getMediaPath() != null && session.getMediaPath().length > 0) {

    var player = playerManager.getPlayer(id);
    player.timestamp = data.timestamp;

    var players = playerManager.getPlayers();
    if(players.size > 1) {
      for(var waitingPlayer of players) {
        if(waitingPlayer[1].sync === Player.Sync.SYNCWAIT) {
          var broadcastResumeEvent = function(syncPlayer, event) {
            syncPlayer.socket.emit(event, updatePlayerState);
            syncPlayer.sync = Player.Sync.SYNCED;
          }

          new ResumeRule(accuracy/2).evaluate(waitingPlayer[1], broadcastResumeEvent);
        }
      }

      if(player.sync === Player.Sync.SYNCED) {
        var broadcastSyncEvent = function(players, event) {
          for(var i in players) {
            players[i].socket.emit(event, updatePlayerState);
          }
        }

        new SyncRule(accuracy).evaluate(player, broadcastSyncEvent);
      } else if(player.sync === Player.Sync.SYNCING) {
        var broadcastJoinEvent = function(leader, player, event) {
          var object = new Object();
          object.seektime = leader.timestamp;
          player.socket.emit(event, object, updatePlayerSync);
        }

        new SyncingRule(accuracy).evaluate(player, broadcastJoinEvent);
      }
    }
  }
};

module.exports = StateEngine;

var updatePlayerState = function(id, timestamp, state) {
  log.info('StateEngine.sync', {Id: id, Timestamp: timestamp, State:state});
  var player = playerManager.getPlayer(id);

  if(player !== null && player !== undefined) {
    player.state      = state;
    player.timestamp  = timestamp;
  } else {
    console.log("Id: " + id);
    console.log(playerManager.getPlayers());
  }
};

var updatePlayerSync = function(id, timestamp, state) {
  var player = playerManager.getPlayer(id);

  if(player !== null && player !== undefined) {
    player.state      = state;
    player.timestamp  = timestamp;
    player.sync = Player.Sync.SYNCWAIT;
  } else {
    console.log("Id: " + id);
    console.log(playerManager.getPlayers());
  }
};
