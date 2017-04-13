var PlayerManager = require('../player/PlayerManager');
var Session       = require('../administration/Session');
var PlayRule      = require('./rules/PlayRule.js');
var SyncRule      = require('./rules/SyncRule.js');
var SyncingRule   = require('./rules/SyncingRule.js');
var ResumeRule    = require('./rules/ResumeRule.js');
var Player        = require('../player/Player');
var Publisher     = require('../process/redis/RedisPublisher');
var LogManager    = require('../log/LogManager');

var playerManager = new PlayerManager();
var session       = new Session();
var accuracy      = 2;
var publisher     = new Publisher();
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
        var commands = [];
        commands.push([player.id, 'state-play']);
        callback([commands]);
      } else {
        var broadcastEvent = function(players) {
          var commands = [];
          for(var i in players) {
            if(players[i].sync !== Player.Sync.DESYNCED) {
              log.info(`StateEngine issuing play ${players[i].id}`);
              commands.push([players[i].id, 'state-play']);

              if(session.getMediaStarted() === false && players[i].isInit()) {
                players[i].sync = Player.Sync.SYNCED;
              }
            }
          }

          if(commands.length > 0) {
            session.mediaStarted();
            callback([commands]);
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
        log.silly('StateEngine issuing pause', issuer);
        var commands = [];
        commands.push([issuer.id, 'state-pause', false]);
        callback([commands]);
      } else {
        var commands = [];
        for(var player of playerManager.getPlayers().values()) {
          if(player.sync !== Player.Sync.DESYNCED) {
            var syncPause = player.sync === Player.Sync.SYNCED || player.sync === Player.Sync.SYNCWAIT ? true : false;
            commands.push([player.id, 'state-pause', syncPause]);
            player.sync = Player.Sync.SYNCED;
          }
        }

        if(commands.length > 0) {
          callback([commands]);
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
        log.silly('StateEngine issuing pause', issuer);
        var commands = [];
        commands.push([issuer.id, 'state-seek', data]);
        callback([commands]);
      } else {
        var commands = [];
        for(var player of playerManager.getPlayers().values()) {
          if(player.sync !== Player.Sync.DESYNCED) {
            commands.push([player.id, 'state-seek', data]);
          }
        }

        if(commands.length > 0) {
          callback([commands]);
        }
      }
    }
  }
};

StateEngine.prototype.pauseSync = function(id, callback) {
  log.debug(`StateEngine.pauseSync ${id}`);
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
          response.seekTime = syncTime;
          var command = [];
          command.push([id, 'state-seek', response]);

          callback([command]);
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

      callback([player.sync]);
    }
  }
};

StateEngine.prototype.timeUpdate = function(id, data, callback) {
  log.silly(`StateEngine.timeUpdate ${id}, ${data.timestamp}`);
  if(session.getMediaPath() != null && session.getMediaPath().length > 0) {

    var player = playerManager.getPlayer(id);
    player.timestamp = data.timestamp;

    var players = playerManager.getPlayers();
    if(players.size > 1 && player !== null && player !== undefined) {
      if(player.sync === Player.Sync.SYNCED) {
        var broadcastSyncEvent = function(syncPlayer, event) {
          syncPlayer.sync = Player.Sync.SYNCWAIT;
          var command = [];
          command.push([player.id, event, false]);
          callback([command]);
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
          object.seekTime = leader.timestamp + 1;
          object.syncWait = true;

          if(playerManager.getSyncedPlayersState() === Player.State.PLAY) {
            object.play = true;
          } else {
            object.play = false;
          }

          var command = [];
          command.push([player.id, event, object]);
          callback([command]);
        }

        new SyncingRule().evaluate(player, broadcastSyncingEvent);
      }
    } else if(player.sync !== Player.Sync.DESYNCED) {
      player.sync = Player.Sync.SYNCED;
      var command = [];
      command.push([player.id, 'state-trigger-ping', false]);
      callback([command]);
    }
  }
};

StateEngine.prototype.playerInit = function(id, callback) {
  log.info(`StateEngine.playerInit ${id}`);
  var player = playerManager.getPlayer(id);

  if(player !== null && player !== undefined) {
    log.debug(`Player: ${id} is initialized`);
    player.initialized = true;
    callback([id]);
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
          var commands = [];
          commands.push([waitingPlayer[1].id, 'state-play']);
          publisher.publish(Publisher.RespEnum.COMMAND, commands);
        } else {
          var commands = [];
          commands.push([waitingPlayer[1].id, 'state-pause', false]);
          publisher.publish(Publisher.RespEnum.COMMAND, commands);
        }

        syncPlayer.sync = Player.Sync.SYNCED;
      }

      new ResumeRule(accuracy/4).evaluate(waitingPlayer[1], broadcastResumeEvent);
    }
  }
};
