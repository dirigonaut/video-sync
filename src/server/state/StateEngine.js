const Promise = require('bluebird');

var player, playRule, syncRule, syncingRule, resumeRule,
    playerManager, accuracy, interval, session, publisher, log;

function StateEngine() { };

StateEngine.prototype.initialize = function(force) {
  if(typeof StateEngine.prototype.protoInit === 'undefined') {
    StateEngine.prototype.protoInit = true;
    player          = this.factory.createPlayer();

    playRule        = this.factory.createPlayRule();
    syncRule        = this.factory.createSyncRule();
    syncingRule     = this.factory.createSyncingRule();
    resumeRule      = this.factory.createResumeRule();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.STATE);
  }

	if(force === undefined ? typeof StateEngine.prototype.stateInit === 'undefined' : force) {
    StateEngine.prototype.stateInit = true;
    playerManager   = this.factory.createPlayerManager();
    session         = this.factory.createSession();
    publisher       = this.factory.createRedisPublisher();

    accuracy = 2;

    var resumeInterval = Promise.coroutine(function* () {
      resumeLogic(playerManager.getPlayers());
    }.bind(this));

    clearInterval(resumeInterval);
    interval = setInterval(resumeInterval, 500);
  }
};

StateEngine.prototype.initPlayer = Promise.coroutine(function* (id) {
  log.debug(`StateEngine.initPlayer ${id}`);
  var basePath = yield session.getMediaPath();
  if(basePath && basePath.length > 0) {
    var player = playerManager.getPlayer(id);

    if(player) {
      return [[player.id], 'state-init'];
    }
  }
});

StateEngine.prototype.play = Promise.coroutine(function* (id) {
  log.debug(`StateEngine.play ${id}`);
  var commands;
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var mediaStarted = yield session.getMediaStarted();
    var player = playerManager.getPlayer(id);

    if(player) {
      if(player.sync === player.Sync.DESYNCED) {
        log.silly('StateEngine issuing play', player);
        commands = [];
        commands.push([player.id, 'state-play']);
      } else {
        var players = playRule.evaluate(player, playerManager.getPlayers(), mediaStarted, accuracy);
        commands = [];

        for(var i in players) {
          if(players[i].sync !== player.Sync.DESYNCED) {
            log.info(`StateEngine issuing play ${players[i].id}`);
            commands.push([players[i].id, 'state-play']);

            if(mediaStarted === false && players[i].isInit()) {
              players[i].sync = player.Sync.SYNCED;
            }
          }
        }

        if(!mediaStarted) {
          yield session.setMediaStarted(!mediaStarted);
        }
      }
    }
  }

  return commands;
});

StateEngine.prototype.pause = Promise.coroutine(function* (id) {
  log.debug(`StateEngine.pause ${id}`);
  var commands;
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var issuer = playerManager.getPlayer(id);

    if(issuer) {
      if(issuer.sync === player.Sync.DESYNCED) {
        log.silly('StateEngine issuing pause', issuer);
        commands = [];
        commands.push([issuer.id, 'state-pause', false]);
      } else {
        commands = [];
        var players = playerManager.getPlayers();
        for(let player of players.values()) {
          if(player.sync !== player.Sync.DESYNCED) {
            var syncPause = player.sync === player.Sync.SYNCED || player.sync === player.Sync.SYNCWAIT ? true : false;
            commands.push([player.id, 'state-pause', syncPause]);
            player.sync = player.Sync.SYNCED;
          }
        }
      }
    }
  }
  return commands;
});

StateEngine.prototype.seek = Promise.coroutine(function* (id, seekTime) {
  log.debug(`StateEngine.seek ${id}`);
  var commands;
  var basePath = yield session.getMediaPath();
  var mediaStarted = yield session.getMediaStarted();

  if(basePath && basePath.length > 0) {
    var issuer = playerManager.getPlayer(id);

    if(issuer) {
      if(issuer.sync === player.Sync.DESYNCED) {
        log.silly('StateEngine issuing pause', issuer);
        commands = [];
        commands.push([issuer.id, 'state-seek', data]);

        if(mediaStarted === false && issuer.isInit()) {
          issuer.sync = player.Sync.SYNCED;
          issuer.timestamp = data.seekTime;
        }
      } else {
        commands = [];
        var players = playerManager.getPlayers();
        for(let player of players.values()) {
          if(player.sync !== player.Sync.DESYNCED) {
            commands.push([player.id, 'state-seek', seekTime]);

            if(mediaStarted === false && player.isInit()) {
              player.sync = player.Sync.SYNCED;
              player.timestamp = seekTime.data;
            }
          }
        }
      }
    }
  }

  return commands;
});

StateEngine.prototype.pauseSync = Promise.coroutine(function* (id) {
  log.debug(`StateEngine.pauseSync ${id}`);
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var player = playerManager.getPlayer(id);

    if(player) {
      if(player.sync !== player.Sync.DESYNCED) {
        var players = playerManager.getPlayers();
        if(players.size > 1) {
          var syncTime = null;

          for(let player of players.values()) {
            if(!syncTime || (player.sync === player.Sync.SYNCED && syncTime > player.timestamp)) {
              syncTime = player.timestamp;
            }
          }

          var response = {};
          response.seekTime = syncTime;
          var command = [];
          command.push([id, 'state-seek', response]);

          return command;
        }
      }
    }
  }
});

StateEngine.prototype.changeSyncState = Promise.coroutine(function* (id, syncState) {
  log.debug(`StateEngine.changeSyncState for ${id}, to ${syncState}`);
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var player = playerManager.getPlayer(id);

    if(player) {
      if(syncState) {
        player.sync = player.Sync.SYNCING;
      } else {
        player.sync = player.Sync.DESYNCED;
      }

      return player.sync;
    }
  }
});

StateEngine.prototype.syncingPing = Promise.coroutine(function* (id, data) {
  log.debug(`StateEngine.syncingPing ${id}, ${data}`);
  var commands;
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var players = playerManager.getPlayers();
    var player = playerManager.getPlayer(id);

    if(player && players) {
      if(data && typeof data.timestamp !== 'undefined') {
        player.timestamp = data.timestamp;
      }

      if(players.size > 1) {
        var isMediaStarted = yield session.getMediaStarted();

        if(player.sync === player.Sync.SYNCING && isMediaStarted) {
          var leader = syncingRule.evaluate(player, playerManager.getOtherPlayers(player.id));

          if(leader) {
            var object = {};
            object.seekTime = leader.timestamp + 1;
            object.syncWait = true;

            if(playerManager.getSyncedPlayersState() === player.State.PLAY) {
              object.play = true;
            } else {
              object.play = false;
            }

            commands = [];
            commands.push([player.id, "state-seek", object]);
          }
        } else if(player.sync === player.Sync.SYNCED) {
          var triggered = syncRule.evaluate(player, playerManager.getPlayers(), accuracy);

          if(triggered) {
            player.sync = player.Sync.SYNCWAIT;
            commands = [];
            commands.push([player.id, "state-pause", false]);
          }
        }
      }
    }
  }

  return commands;
});

StateEngine.prototype.playerInit = Promise.coroutine(function* (id) {
  log.info(`StateEngine.playerInit ${id}`);
  var player = playerManager.getPlayer(id);

  if(player) {
    log.debug(`Player: ${id} is initialized`);
    player.initialized = true;
    return id;
  } else {
    log.silly("Could not find the player.");
    log.silly("Current users: ", playerManager.getPlayers());
  }
});

StateEngine.prototype.updatePlayerState = Promise.coroutine(function* (id, timestamp, state) {
  log.info(`StateEngine.updatePlayerState ${id}`);
  var player = playerManager.getPlayer(id);

  if(player) {
    player.state      = state ? player.State.PAUSE : player.State.PLAY;
    player.timestamp  = timestamp;
  } else {
    log.silly("Could not find the player.");
    log.silly("Current users: ", playerManager.getPlayers());
  }
});

StateEngine.prototype.updatePlayerSync = Promise.coroutine(function* (id, timestamp, state) {
  log.info(`StateEngine.updatePlayerSync ${id}`);
  var player = playerManager.getPlayer(id);

  if(player) {
    player.state      = state ? player.State.PAUSE : player.State.PLAY;
    player.timestamp  = timestamp;
    player.sync       = player.Sync.SYNCWAIT;
  } else {
    log.silly("Could not find the player.");
    log.silly("Current users: ", playerManager.getPlayers());
  }
});

module.exports = StateEngine;

var resumeLogic = Promise.coroutine(function* (players) {
  for(let waitingPlayer of players.values()) {
    if(waitingPlayer.sync === player.Sync.SYNCWAIT) {
      var triggered = resumeRule.evaluate(waitingPlayer, playerManager.getOtherPlayers(waitingPlayer.id), accuracy/4);

      if(triggered) {
        if(playerManager.getSyncedPlayersState() === player.State.PLAY) {
          var commands = [];
          commands.push([waitingPlayer.id, 'state-play']);
          yield publisher.publishAsync(publisher.RespEnum.COMMAND, commands);
        } else {
          var commands = [];
          commands.push([waitingPlayer.id, 'state-pause', false]);
          yield publisher.publishAsync(publisher.RespEnum.COMMAND, commands);
        }

        waitingPlayer.sync = player.Sync.SYNCED;
      }
    }
  }
});
