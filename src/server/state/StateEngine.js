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

StateEngine.prototype.init = function(id, callback) {
  log.debug('StateEngine.init');

  if(session.getMediaPath() !== null && session.getMediaPath().length > 0) {
    var player = playerManager.getPlayer(id);

    if(player !== null && player !== undefined) {
      log.debug(`Init player ${player.id}`);
      callback([[player.id], 'state-init']);
    }
  }
}

StateEngine.prototype.play = function(id, callback) {
  log.debug(`StateEngine.play ${id}`);
  if(session.getMediaPath() !== null && session.getMediaPath().length > 0) {
    var player = playerManager.getPlayer(id);

    if(player !== null && player !== undefined) {
      if(player.sync === Player.Sync.DESYNCED) {
        log.silly('StateEngine issuing play', player);
        callback([player.id, 'state-play']);
      } else {
        var broadcastEvent = function(players) {
          var playerIds = [];
          for(var i in players) {
            if(players[i].sync !== Player.Sync.DESYNCED) {
              log.info(`StateEngine issuing play ${players[i].id}`);
              playerIds.push(players[i].id);

              if(session.getMediaStarted() === false && players[i].isInit()) {
                players[i].sync = Player.Sync.SYNCED;
              }
            }
          }

          if(playerIds.length > 0) {
            session.mediaStarted();
            callback([playerIds, 'state-play']);
          }
        }

        new PlayRule(accuracy).evaluate(player, broadcastEvent);
      }
    }
  }
};

StateEngine.prototype.pause = function(id, callback) {
  log.debug(`StateEngine.pause ${id}`);
  if(session.getMediaPath() !== null && session.getMediaPath().length > 0) {
    var issuer = playerManager.getPlayer(id);

    if(issuer !== null && issuer !== undefined) {
      if(issuer.sync === Player.Sync.DESYNCED) {
        callback([issuer.id, 'state-pause', false]);
      } else {
        var playerIds = [];
        for(var player of playerManager.getPlayers().values()) {
          if(player.sync !== Player.Sync.DESYNCED) {
            playerIds.push(player.id);
            player.sync = Player.Sync.SYNCED;
          }
        }

        log.info(playerIds);
        if(playerIds.length > 0) {
          callback([playerIds, 'state-pause', true]);
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
        callback([player.id, 'state-seek', data]);
      } else {
        var playerIds = [];
        for(var player of playerManager.getPlayers().values()) {
          if(player.sync !== Player.Sync.DESYNCED) {
            playerIds.push(player.id);
          }
        }

        if(playerIds.length > 0) {
          callback([playerIds, 'state-seek', data]);
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

          callback([id, 'state-seek', response]);
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

      callback(player.sync);
    }
  }
};

StateEngine.prototype.timeUpdate = function(id, data, callback) {
  log.silly(`StateEngine.timeUpdate ${id}`);
  if(session.getMediaPath() != null && session.getMediaPath().length > 0) {

    var player = playerManager.getPlayer(id);
    player.timestamp = data.timestamp;

    var players = playerManager.getPlayers();
    if(players.size > 1 && player !== null && player !== undefined) {
      if(player.sync === Player.Sync.SYNCED) {
        var broadcastSyncEvent = function(syncPlayer, event) {
          syncPlayer.sync = Player.Sync.SYNCWAIT;
          callback([player.id, event, false]);
        }

        new SyncRule(accuracy).evaluate(player, broadcastSyncEvent);
      }
    }
  }
};

StateEngine.prototype.syncingPing = function(id, callback) {
  log.silly(`StateEngine.syncingPing ${id}`);
  if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
    var players = playerManager.getPlayers();
    var player = playerManager.getPlayer(id);

    if(players.size > 1 && player !== null && player !== undefined) {
      if(player.sync === Player.Sync.SYNCING && session.getMediaStarted()) {
        var broadcastSyncingEvent = function(leader, player, event) {
          var object = new Object();
          object.seektime = leader.timestamp + 1;
          callback([player.id, event, object]);

          if(playerManager.getSyncedPlayersState() === Player.State.PLAY) {
            callback([player.id, 'state-play']);
          } else {
            callback([player.id, 'state-pause', false]);
          }
        }

        new SyncingRule().evaluate(player, broadcastSyncingEvent);
      }
    } else if(player.sync !== Player.Sync.DESYNCED) {
      player.sync = Player.Sync.SYNCED;
      callback([player.id, 'state-trigger-ping', false]);
    }
  }
};

StateEngine.prototype.playerInit = function(id) {
  log.info(`StateEngine.playerInit ${id}`);
  var player = playerManager.getPlayer(id);

  if(player !== null && player !== undefined) {
    log.debug(`Player: ${id} is initialized`);
    player.initialized = true;

    var stateEngine = new StateEngine();
    stateEngine.syncingPing(id);
  } else {
    log.silly("Could not find the player.");
    log.silly("Current users: ", playerManager.getPlayers());
  }
};

StateEngine.prototype.updatePlayerState = function(id, timestamp, state) {
  log.info(`StateEngine.updatePlayerState ${id}`);
  var player = playerManager.getPlayer(id);

  if(player !== null && player !== undefined) {
    player.state      = state ? Player.State.PAUSE : Player.State.PLAY;
    player.timestamp  = timestamp;
  } else {
    log.silly("Could not find the player.");
    log.silly("Current users: ", playerManager.getPlayers());
  }
};

StateEngine.prototype.updatePlayerSync = function(id, timestamp, state) {
  log.info(`StateEngine.updatePlayerSync ${id}`);
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

module.exports = StateEngine;

var resumeLogic = function(players) {
  for(var waitingPlayer of players) {
    if(waitingPlayer[1].sync === Player.Sync.SYNCWAIT) {
      var broadcastResumeEvent = function(syncPlayer) {
        if(playerManager.getSyncedPlayersState() === Player.State.PLAY) {
          //syncPlayer.socket.emit('state-play', updatePlayerState);
        } else {
          //syncPlayer.socket.emit('state-pause', false, updatePlayerState);
        }

        syncPlayer.sync = Player.Sync.SYNCED;
      }

      //new ResumeRule(accuracy/4).evaluate(waitingPlayer[1], broadcastResumeEvent);
    }
  }
};
