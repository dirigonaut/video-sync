const Promise = require('bluebird');

var player, playRule, syncRule, syncingRule, resumeRule, schemaFactory,
    playerManager, accuracy, interval, session, publisher, log;

function StateEngine() { };

StateEngine.prototype.initialize = function(force) {
  if(typeof StateEngine.prototype.protoInit === 'undefined') {
    StateEngine.prototype.protoInit = true;
    schemaFactory   = this.factory.createSchemaFactory();

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
      if(player.desynced) {
        log.silly('StateEngine issuing play', player);
        commands = [];
        commands.push([player.id, 'state-play']);
      } else {
        var players = playRule.evaluate(player, playerManager.getPlayers(), mediaStarted, accuracy);
        commands = [];

        for(var i in players) {
          if(!players[i].desynced) {
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
      if(issuer.desynced) {
        log.silly('StateEngine issuing pause', issuer);
        commands = [];
        var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [undefined, undefined, false]);
        commands.push([issuer.id, 'state-pause', schema]);
      } else {
        commands = [];
        var players = playerManager.getPlayers();
        for(let player of players.values()) {
          if(!player.desynced) {
            var syncPause = player.sync === player.Sync.SYNCED || player.sync === player.Sync.SYNCWAIT ? true : false;
            var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [undefined, undefined, syncPause]);
            commands.push([player.id, 'state-pause', schema]);
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
      if(issuer.desynced) {
        log.silly('StateEngine issuing pause', issuer);
        commands = [];
        var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [undefined, seekTime, undefined]);
        commands.push([issuer.id, 'state-seek', schema]);

        if(issuer.isInit()) {
          issuer.timestamp = data.seekTime;
        }
      } else {
        commands = [];
        var players = playerManager.getPlayers();
        for(let player of players.values()) {
          if(!player.desynced) {
            var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [undefined, seekTime, undefined]);
            commands.push([player.id, 'state-seek', schema]);

            if(mediaStarted === false && player.isInit()) {
              player.sync       = player.Sync.BUFFWAIT;
              player.timestamp  = seekTime.data;
              player.buffered   = false;
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
  var command;
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var player = playerManager.getPlayer(id);

    if(player) {
      if(!player.desynced) {
        var players = playerManager.getPlayers();
        if(players.size > 1) {
          var syncTime;

          for(let player of players.values()) {
            if(!syncTime || (player.sync === player.Sync.SYNCED && syncTime > player.timestamp)) {
              syncTime = player.timestamp;
            }
          }

          var command = [];
          var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [undefined, syncTime, undefined]);
          command.push([id, 'state-seek', schema]);
        }
      }
    }
  }
  return command;
});

StateEngine.prototype.changeSyncState = Promise.coroutine(function* (id, syncState) {
  log.debug(`StateEngine.changeSyncState for ${id}, to ${syncState}`);
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var player = playerManager.getPlayer(id);

    if(player) {
      if(syncState) {
        player.desynced = false;
      } else {
        player.desynced = true;
      }

      return player.desynced;
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
        player.buffered  = data.buffered;
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
            var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [object.play, object.seekTime, object.syncWait]);
            commands.push([player.id, "state-seek", object]);
          }
        } else if(player.sync === player.Sync.SYNCED) {
          var triggered = syncRule.evaluate(player, playerManager.getPlayers(), accuracy);

          if(triggered) {
            player.sync = player.Sync.SYNCWAIT;
            commands = [];
            var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [undefined, undefined, false]);
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

StateEngine.prototype.updatePlayerSync = Promise.coroutine(function* (id, timestamp, state, buffered) {
  log.info(`StateEngine.updatePlayerSync ${id}`);
  var player = playerManager.getPlayer(id);

  if(player) {
    player.state      = state ? player.State.PAUSE : player.State.PLAY;
    player.timestamp  = timestamp;
    player.sync       = player.Sync.SYNCWAIT;
    player.buffered   = buffered;
  } else {
    log.silly("Could not find the player.");
    log.silly("Current users: ", playerManager.getPlayers());
  }
});

module.exports = StateEngine;

var resumeLogic = Promise.coroutine(function* (players) {
  var canPlay;
  var canPlayList = [];
  for(let waitingPlayer of players.values()) {
    if(waitingPlayer.desynced) {
      continue;
    } else if(waitingPlayer.sync === player.Sync.SYNCWAIT) {
      var triggered = resumeRule.evaluate(waitingPlayer, playerManager.getOtherPlayers(waitingPlayer.id), accuracy/4);

      if(triggered) {
        if(playerManager.getSyncedPlayersState() === player.State.PLAY) {
          var commands = [];
          commands.push([waitingPlayer.id, 'state-play']);
          yield publisher.publishAsync(publisher.RespEnum.COMMAND, commands);
        } else {
          var commands = [];
          var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [undefined, undefined, false]);
          commands.push([waitingPlayer.id, 'state-pause', schema]);
          yield publisher.publishAsync(publisher.RespEnum.COMMAND, commands);
        }

        waitingPlayer.sync = player.Sync.SYNCED;
      }
    } else if(waitingPlayer.sync === player.Sync.BUFFWAIT) {
      canPlay = canplay ? canplay & waitingPlayer.buffer : waitingPlayer.buffer;
      canPlayList.push(waitingPlayer);
    }
  }

  if(canPlay && canPlayList.length > 0) {
    commands = [];

    for(var i in canPlayList) {
      if(!canPlayList[i].desynced) {
        log.info(`StateEngine issuing play ${canPlayList[i].id}`);
        commands.push([canPlayList[i].id, 'state-play']);
        canPlayList[i].sync = player.Sync.SYNCED;
      }
    }

    yield publisher.publishAsync(publisher.RespEnum.COMMAND, commands);
  }
});
