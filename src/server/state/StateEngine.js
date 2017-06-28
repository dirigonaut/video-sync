const Promise       = require('bluebird');
const Player        = require('../player/Player');

var accuracy, interval, session, log;

function StateEngine() { };

StateEngine.prototype.initialize = function() {
  if(typeof StateEngine.prototype.lazyInit === 'undefined') {
    session         = this.factory.createSession();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.STATE);

    accuracy  = 2;
    interval  = setInterval(Promise.coroutine(function* () {
      resumeLogic.call(this, yield this.playerManager.getPlayers());
    }.bind(this)), 500);

    StateEngine.prototype.lazyInit = true;
  }
};

StateEngine.prototype.initPlayer = Promise.coroutine(function* (id) {
  log.debug('StateEngine.init');
  var basePath = yield session.getMediaPath();
  if(basePath && basePath.length > 0) {
    var player = yield this.playerManager.getPlayer(id);

    if(player) {
      log.debug(`Init player ${player.id}`);
      return new Promise.resolve([[player.id], 'state-init']);
    }
  }
});

StateEngine.prototype.play = Promise.coroutine(function* (id) {
  log.debug(`StateEngine.play ${id}`);
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var mediaStarted = yield session.getMediaStarted();
    var player = yield this.playerManager.getPlayer(id);

    if(player) {
      if(player.sync === Player.Sync.DESYNCED) {
        log.silly('StateEngine issuing play', player);
        var commands = [];
        commands.push([player.id, 'state-play']);
        return new Promise.resolve(commands);
      } else {
        var playRule = this.factory.createPlayRule();
        var players = playRule.evaluate(player, yield this.playerManager.getPlayers(), mediaStarted, accuracy);

        var commands = [];
        for(var i in players) {
          if(players[i].sync !== Player.Sync.DESYNCED) {
            log.info(`StateEngine issuing play ${players[i].id}`);
            commands.push([players[i].id, 'state-play']);

            if(mediaStarted === false && players[i].isInit()) {
              players[i].sync = Player.Sync.SYNCED;
            }
          }
        }

        if(commands.length > 0) {
          if(!mediaStarted) {
            yield session.setMediaStarted(!mediaStarted);
          }

          return new Promise.resolve(commands);
        }
      }
    }
  }
});

StateEngine.prototype.pause = Promise.coroutine(function* (id) {
  log.debug(`StateEngine.pause ${id}`);
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var issuer = yield this.playerManager.getPlayer(id);

    if(issuer) {
      if(issuer.sync === Player.Sync.DESYNCED) {
        log.silly('StateEngine issuing pause', issuer);
        var commands = [];
        commands.push([issuer.id, 'state-pause', false]);
        return new Promise.resolve(commands);
      } else {
        var commands = [];
        var players = yield this.playerManager.getPlayers();
        for(var player of players.values()) {
          if(player.sync !== Player.Sync.DESYNCED) {
            var syncPause = player.sync === Player.Sync.SYNCED || player.sync === Player.Sync.SYNCWAIT ? true : false;
            commands.push([player.id, 'state-pause', syncPause]);
            player.sync = Player.Sync.SYNCED;
          }
        }

        if(commands.length > 0) {
          return new Promise.resolve(commands);
        }
      }
    }
  }
});

StateEngine.prototype.seek = Promise.coroutine(function* (id, data) {
  log.debug('StateEngine.seek');
  var basePath = yield session.getMediaPath();
  var mediaStarted = yield session.getMediaStarted();

  if(basePath && basePath.length > 0) {
    var issuer = yield this.playerManager.getPlayer(id);

    if(issuer) {
      if(issuer.sync === Player.Sync.DESYNCED) {
        log.silly('StateEngine issuing pause', issuer);
        var commands = [];
        commands.push([issuer.id, 'state-seek', data]);

        if(mediaStarted === false && issuer.isInit()) {
          issuer.sync = Player.Sync.SYNCED;
          issuer.timestamp = data.seekTime;
        }

        return new Promise.resolve(commands);
      } else {
        var commands = [];
        var players = yield this.playerManager.getPlayers();
        for(var player of players.values()) {
          if(player.sync !== Player.Sync.DESYNCED) {
            commands.push([player.id, 'state-seek', data]);

            if(mediaStarted === false && player.isInit()) {
              player.sync = Player.Sync.SYNCED;
              player.timestamp = data.seekTime;
            }
          }
        }

        if(commands.length > 0) {
          return new Promise.resolve(commands);
        }
      }
    }
  }
});

StateEngine.prototype.pauseSync = Promise.coroutine(function* (id) {
  log.debug(`StateEngine.pauseSync ${id}`);
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var player = yield this.playerManager.getPlayer(id);

    if(player !== null && player !== undefined) {
      if(player.sync !== Player.Sync.DESYNCED) {
        var players = yield this.playerManager.getPlayers();
        if(players.size > 1) {
          var syncTime = null;

          for(var player of players.values()) {
            if(syncTime === null || (player.sync === Player.Sync.SYNCED && syncTime > player.timestamp)) {
              syncTime = player.timestamp;
            }
          }

          var response = {};
          response.seekTime = syncTime;
          var command = [];
          command.push([id, 'state-seek', response]);

          return new Promise.resolve(command);
        }
      }
    }
  }
});

StateEngine.prototype.changeSyncState = Promise.coroutine(function* (id, syncState) {
  log.debug(`StateEngine.changeSyncState for ${id}, to ${syncState}`);
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var player = yield this.playerManager.getPlayer(id);

    if(player) {
      if(syncState) {
        player.sync = Player.Sync.SYNCING;
      } else {
        player.sync = Player.Sync.DESYNCED;
      }

      return new Promise.resolve([player.sync]);
    }
  }
});

StateEngine.prototype.syncingPing = Promise.coroutine(function* (id, data) {
  log.silly(`StateEngine.syncingPing ${id}, ${data}`);
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var players = yield this.playerManager.getPlayers();
    var player = yield this.playerManager.getPlayer(id);

    if(player) {
      if(data && typeof data.timestamp !== "undefined") {
        player.timestamp = data.timestamp;
      }

      if(players.size > 1) {
        var isMediaStarted = yield session.getMediaStarted();

        if(player.sync === Player.Sync.SYNCING && isMediaStarted) {
          var syncingRule = this.factory.createSyncingRule();
          var leader = syncingRule.evaluate(player, yield this.playerManager.getOtherPlayers(player.id));

          if(leader) {
            var object = {};
            object.seekTime = leader.timestamp + 1;
            object.syncWait = true;

            if(this.playerManager.getSyncedPlayersState() === Player.State.PLAY) {
              object.play = true;
            } else {
              object.play = false;
            }

            var command = [];
            command.push([player.id, "state-seek", object]);
            return new Promise.resolve(command);
          }
        } else if(player.sync === Player.Sync.SYNCED) {
          var syncRule = this.factory.createSyncRule();
          var triggered = syncRule.evaluate(player, yield this.playerManager.getPlayers(), accuracy);

          if(triggered) {
            player.sync = Player.Sync.SYNCWAIT;
            var command = [];
            command.push([player.id, "state-pause", false]);
            return new Promise.resolve(command);
          }
        }
      }
    }
  }

  return new Promise.resolve();
});

StateEngine.prototype.playerInit = Promise.coroutine(function* (id) {
  log.info(`StateEngine.playerInit ${id}`);
  var player = yield this.playerManager.getPlayer(id);

  if(player) {
    log.debug(`Player: ${id} is initialized`);
    player.initialized = true;
    return [id];
  } else {
    log.silly("Could not find the player.");
    log.silly("Current users: ", yield this.playerManager.getPlayers());
  }
});

StateEngine.prototype.updatePlayerState = Promise.coroutine(function* (id, timestamp, state) {
  log.info(`StateEngine.updatePlayerState ${id}`);
  var player = yield this.playerManager.getPlayer(id);

  if(player) {
    player.state      = state ? Player.State.PAUSE : Player.State.PLAY;
    player.timestamp  = timestamp;
  } else {
    log.silly("Could not find the player.");
    log.silly("Current users: ", yield this.playerManager.getPlayers());
  }
});

StateEngine.prototype.updatePlayerSync = Promise.coroutine(function* (id, timestamp, state) {
  log.info(`StateEngine.updatePlayerSync ${id}`);
  var player = yield this.playerManager.getPlayer(id);

  if(player) {
    player.state      = state ? Player.State.PAUSE : Player.State.PLAY;
    player.timestamp  = timestamp;
    player.sync       = Player.Sync.SYNCWAIT;
  } else {
    log.silly("Could not find the player.");
    log.silly("Current users: ", yield this.playerManager.getPlayers());
  }
});

module.exports = StateEngine;

var resumeLogic = Promise.coroutine(function* (players) {
  for(let waitingPlayer of players) {
    if(waitingPlayer[1].sync === Player.Sync.SYNCWAIT) {
      var resumeRule = this.factory.createResumeRule();
      var triggered = resumeRule.evaluate(waitingPlayer[1], yield this.playerManager.getOtherPlayers(waitingPlayer.id), accuracy/4);

      if(triggered) {
        if(yield this.playerManager.getSyncedPlayersState() === Player.State.PLAY) {
          var commands = [];
          commands.push([waitingPlayer[1].id, 'state-play']);
          this.redisPublisher.publish(this.redisPublisher.respEnum.COMMAND, commands);
        } else {
          var commands = [];
          commands.push([waitingPlayer[1].id, 'state-pause', false]);
          this.redisPublisher.publish(this.redisPublisher.respEnum.COMMAND, commands);
        }

        waitingPlayer[1].sync = Player.Sync.SYNCED;
      }
    }
  }
});
