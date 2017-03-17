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
var log           = LogManager.getLog(LogManager.LogEnum.STATE);

var interval = setInterval(function() {
  resumeLogic(playerManager.getPlayers());
}, 500);

function StateEngine() {

}

StateEngine.prototype.play = function(id, callback) {
  log.debug('StateEngine.play');
  if(session.getMediaPath() !== null && session.getMediaPath().length > 0) {
    var player = playerManager.getPlayer(id);

    if(player !== null && player !== undefined) {
      if(player.sync === Player.Sync.DESYNCED) {
        log.silly('StateEngine issuing play', player);
        player.socket.emit('state-play', updatePlayerState);
      } else {
        var broadcastEvent = function(players) {
          for(var i in players) {
            if(players[i].sync !== Player.Sync.DESYNCED) {
              log.silly('StateEngine issuing play', player);
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
  }
};

StateEngine.prototype.pause = function(id, callback) {
  log.debug('StateEngine.pause');
  if(session.getMediaPath() !== null && session.getMediaPath().length > 0) {
    var player = playerManager.getPlayer(id);

    if(player !== null && player !== undefined) {
      if(player.sync === Player.Sync.DESYNCED) {
        player.socket.emit('state-pause', false, updatePlayerState);
      } else {
        for(var player of playerManager.getPlayers().values()) {
          if(player.sync !== Player.Sync.DESYNCED) {
            player.socket.emit('state-pause', player.sync === Player.Sync.SYNCED || player.sync === Player.Sync.SYNCWAIT ? true : false, updatePlayerState);
            player.sync = Player.Sync.SYNCED;

            if(callback !== undefined && callback !== null) {
              callback();
            }
          }
        }
      }
    }
  }
};

StateEngine.prototype.seek = function(id, data, callback) {
  log.debug('StateEngine.seek');
  if(session.getMediaPath() !== null && session.getMediaPath().length > 0 && session.getMediaStarted()) {
    var issuer = playerManager.getPlayer(id);

    if(issuer !== null && issuer !== undefined) {
      if(issuer.sync === Player.Sync.DESYNCED) {
        issuer.socket.emit('state-seek', data, updatePlayerState);
      } else {
        for(var player of playerManager.getPlayers().values()) {
          if(player.sync !== Player.Sync.DESYNCED) {
            player.socket.emit('state-seek', data, updatePlayerState);
          }
        }

        if(callback !== undefined && callback !== null) {
          callback();
        }
      }
    }
  }
};

StateEngine.prototype.pauseSync = function(id, callback) {
  log.debug('StateEngine.sync');
  if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
    var player = playerManager.getPlayer(id);

    if(player !== null && player !== undefined) {
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
  }
};

StateEngine.prototype.changeSyncState = function(id, syncState, callback) {
  log.debug(`StateEngine.changeSyncState for ${id}, to ${syncState}`);
  if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
    var player = playerManager.getPlayer(id);

    if(player !== null && player !== undefined) {
      if(syncState) {
        player.sync = Player.Sync.SYNCING;
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
  log.silly(`StateEngine.timeUpdate ${id}`);
  if(session.getMediaPath() != null && session.getMediaPath().length > 0) {

    var player = playerManager.getPlayer(id);
    player.timestamp = data.timestamp;

    var players = playerManager.getPlayers();
    if(players.size > 1 && player !== null && player !== undefined) {
      if(player.sync === Player.Sync.SYNCED) {
        var broadcastSyncEvent = function(syncPlayer, event) {
          syncPlayer.socket.emit(event, false, updatePlayerState);
          syncPlayer.sync = Player.Sync.SYNCWAIT;
        }

        new SyncRule(accuracy).evaluate(player, broadcastSyncEvent);
      }
    }
  }
};

StateEngine.prototype.syncingPing = function(id) {
  log.silly(`StateEngine.syncingPing ${id}`);
  if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
    var players = playerManager.getPlayers();
    var player = playerManager.getPlayer(id);

    if(players.size > 1 && player !== null && player !== undefined) {
      if(player.sync === Player.Sync.SYNCING && session.getMediaStarted()) {
        var broadcastSyncingEvent = function(leader, player, event) {
          var object = new Object();
          object.seektime = leader.timestamp + 1;
          player.socket.emit(event, object, updatePlayerSync);
        }

        new SyncingRule().evaluate(player, broadcastSyncingEvent);
      }
    } else if(player.sync !== Player.Sync.DESYNCED) {
      player.socket.emit('state-trigger-ping', false);
      player.sync = Player.Sync.SYNCED;
    }
  }
};

module.exports = StateEngine;

var updatePlayerState = function(id, timestamp, state) {
  var player = playerManager.getPlayer(id);

  if(player !== null && player !== undefined) {
    player.state      = state ? Player.State.PAUSE : Player.State.PLAY;
    player.timestamp  = timestamp;
  } else {
    log.silly("Could not find the player.");
    log.silly("Current users: ", playerManager.getPlayers());
  }
};

var updatePlayerSync = function(id, timestamp, state) {
  var player = playerManager.getPlayer(id);

  if(player !== null && player !== undefined) {
    player.state      = state ? Player.State.PAUSE : Player.State.PLAY;
    player.timestamp  = timestamp;
    player.sync       = Player.Sync.SYNCWAIT;
  } else {
    log.silly("Could not find the player.");
    log.silly("Current users: ", playerManager.getPlayers());
  }
};

var resumeLogic = function(players) {
  for(var waitingPlayer of players) {
    if(waitingPlayer[1].sync === Player.Sync.SYNCWAIT) {
      var broadcastResumeEvent = function(syncPlayer, event) {
        if(playerManager.getSyncedPlayersState() === Player.State.PLAY) {
          syncPlayer.socket.emit('state-play', updatePlayerState);
        } else {
          syncPlayer.socket.emit('state-pause', false, updatePlayerState);
        }

        syncPlayer.sync = Player.Sync.SYNCED;
      }

      new ResumeRule(accuracy/4).evaluate(waitingPlayer[1], broadcastResumeEvent);
    }
  }
};
