const Promise       = require('bluebird');
const Player        = require('../player/Player');

var accuracy, interval, log;

function StateEngine() { };

StateEngine.prototype.initialize = function() {
  accuracy  = 2;
  log       = this.logManager.getLog(this.logManager.LogEnum.STATE);
  interval  = setInterval(function() {
    resumeLogic.call(this, this.playerManager.getPlayers());
  }, 500);
};

StateEngine.prototype.initPlayer = Promise.coroutine(function* (id, callback) {
  log.debug('StateEngine.init');
  var basePath = yield this.session.getMediaPath();
  if(basePath !== null && basePath !== undefined && basePath.length > 0) {
    var player = this.playerManager.getPlayer(id);

    if(player !== null && player !== undefined) {
      log.debug(`Init player ${player.id}`);
      callback([[player.id], 'state-init']);
    }
  }
});

StateEngine.prototype.play = Promise.coroutine(function* (id, callback) {
  log.debug(`StateEngine.play ${id}`);
  var basePath = yield this.session.getMediaPath();

  if(basePath !== null && basePath !== undefined && basePath.length > 0) {
    var mediaStarted = yield this.session.getMediaStarted();
    var player = this.playerManager.getPlayer(id);

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

              if(mediaStarted === false && players[i].isInit()) {
                players[i].sync = Player.Sync.SYNCED;
              }
            }
          }

          if(commands.length > 0) {
            if(!mediaStarted) {
              this.session.setMediaStarted(!mediaStarted);
            }

            callback([commands]);
          }
        }.bind(this);
      }

      var playRule = yield this.factory.createPlayRule();
      playRule.evaluate(player, this.playerManager, mediaStarted, accuracy, broadcastEvent);
    }
  }
});

StateEngine.prototype.pause = Promise.coroutine(function* (id, callback) {
  log.debug(`StateEngine.pause ${id}`);
  var basePath = yield this.session.getMediaPath();

  if(basePath !== null && basePath !== undefined && basePath.length > 0) {
    var issuer = this.playerManager.getPlayer(id);

    if(issuer !== null && issuer !== undefined) {
      if(issuer.sync === Player.Sync.DESYNCED) {
        log.silly('StateEngine issuing pause', issuer);
        var commands = [];
        commands.push([issuer.id, 'state-pause', false]);
        callback([commands]);
      } else {
        var commands = [];
        for(var player of this.playerManager.getPlayers().values()) {
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
});

StateEngine.prototype.seek = Promise.coroutine(function* (id, data, callback) {
  log.debug('StateEngine.seek');
  var basePath = yield this.session.getMediaPath();

  if(basePath !== null && basePath !== undefined && basePath.length > 0) {
    var issuer = this.playerManager.getPlayer(id);

    if(issuer !== null && issuer !== undefined) {
      if(issuer.sync === Player.Sync.DESYNCED) {
        log.silly('StateEngine issuing pause', issuer);
        var commands = [];
        commands.push([issuer.id, 'state-seek', data]);
        callback([commands]);
      } else {
        var commands = [];
        for(var player of this.playerManager.getPlayers().values()) {
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
});

StateEngine.prototype.pauseSync = Promise.coroutine(function* (id, callback) {
  log.debug(`StateEngine.pauseSync ${id}`);
  var basePath = yield this.session.getMediaPath();

  if(basePath !== null && basePath !== undefined && basePath.length > 0) {
    var player = this.playerManager.getPlayer(id);

    if(player !== null && player !== undefined) {
      if(player.sync !== Player.Sync.DESYNCED) {
        if(this.playerManager.getPlayers().size > 1) {
          var syncTime = null;

          for(var player of this.playerManager.getPlayers().values()) {
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
});

StateEngine.prototype.changeSyncState = Promise.coroutine(function* (id, syncState, callback) {
  log.debug(`StateEngine.changeSyncState for ${id}, to ${syncState}`);
  var basePath = yield this.session.getMediaPath();

  if(basePath !== null && basePath !== undefined && basePath.length > 0) {
    var player = this.playerManager.getPlayer(id);

    if(player !== null && player !== undefined) {
      if(syncState) {
        player.sync = Player.Sync.SYNCING;
      } else {
        player.sync = Player.Sync.DESYNCED;
      }

      callback([player.sync]);
    }
  }
});

StateEngine.prototype.timeUpdate = Promise.coroutine(function* (id, data, callback) {
  log.silly(`StateEngine.timeUpdate ${id}, ${data.timestamp}`);
  var basePath = yield this.session.getMediaPath();

  if(basePath !== null && basePath !== undefined && basePath.length > 0) {
    var player = this.playerManager.getPlayer(id);
    player.timestamp = data.timestamp;

    var players = this.playerManager.getPlayers();
    if(players.size > 1 && player !== null && player !== undefined) {
      if(player.sync === Player.Sync.SYNCED) {
        var broadcastSyncEvent = function(syncPlayer, event) {
          syncPlayer.sync = Player.Sync.SYNCWAIT;
          var command = [];
          command.push([player.id, event, false]);
          callback([command]);
        }

        var syncRule = yield this.factory.createSyncRule();
        syncRule.evaluate(player, playerManager, accuracy, broadcastSyncEvent);
      }
    }
  }
});

StateEngine.prototype.syncingPing = Promise.coroutine(function* (id, callback) {
  log.silly(`StateEngine.syncingPing ${id}`);
  var basePath = yield this.session.getMediaPath();

  if(basePath !== null && basePath !== undefined && basePath.length > 0) {
    var players = this.playerManager.getPlayers();
    var player = this.playerManager.getPlayer(id);

    if(players.size > 1 && player !== null && player !== undefined) {
      var isMediaStarted = yield this.session.getMediaStarted();

      if(player.sync === Player.Sync.SYNCING && isMediaStarted) {
        var broadcastSyncingEvent = function(leader, player, event) {
          var object = new Object();
          object.seekTime = leader.timestamp + 1;
          object.syncWait = true;

          if(this.playerManager.getSyncedPlayersState() === Player.State.PLAY) {
            object.play = true;
          } else {
            object.play = false;
          }

          var command = [];
          command.push([player.id, event, object]);
          callback([command]);
        }

        var syncingRule = yield this.factory.createSyncingRule();
        syncingRule.evaluate(player, playerManager, broadcastSyncingEvent);
      }
    } else if(player.sync !== Player.Sync.DESYNCED) {
      player.sync = Player.Sync.SYNCED;
      var command = [];
      command.push([player.id, 'state-trigger-ping', false]);
      callback([command]);
    }
  }
});

StateEngine.prototype.playerInit = function(id, callback) {
  log.info(`StateEngine.playerInit ${id}`);
  var player = this.playerManager.getPlayer(id);

  if(player !== null && player !== undefined) {
    log.debug(`Player: ${id} is initialized`);
    player.initialized = true;
    callback([id]);
  } else {
    log.silly("Could not find the player.");
    log.silly("Current users: ", this.playerManager.getPlayers());
  }
};

StateEngine.prototype.updatePlayerState = function(id, timestamp, state) {
  log.info(`StateEngine.updatePlayerState ${id}`);
  var player = this.playerManager.getPlayer(id);

  if(player !== null && player !== undefined) {
    player.state      = state ? Player.State.PAUSE : Player.State.PLAY;
    player.timestamp  = timestamp;
  } else {
    log.silly("Could not find the player.");
    log.silly("Current users: ", this.playerManager.getPlayers());
  }
};

StateEngine.prototype.updatePlayerSync = function(id, timestamp, state) {
  log.info(`StateEngine.updatePlayerSync ${id}`);
  var player = this.playerManager.getPlayer(id);

  if(player !== null && player !== undefined) {
    player.state      = state ? Player.State.PAUSE : Player.State.PLAY;
    player.timestamp  = timestamp;
    player.sync       = Player.Sync.SYNCWAIT;
  } else {
    log.silly("Could not find the player.");
    log.silly("Current users: ", this.playerManager.getPlayers());
  }
};

module.exports = StateEngine;

var resumeLogic = Promise.coroutine(function*(players) {
  for(var waitingPlayer of players) {
    if(waitingPlayer[1].sync === Player.Sync.SYNCWAIT) {
      var broadcastResumeEvent = function(syncPlayer) {
        if(this.playerManager.getSyncedPlayersState() === Player.State.PLAY) {
          var commands = [];
          commands.push([waitingPlayer[1].id, 'state-play']);
          this.redisPublisher.publish(this.redisPublisher.respEnum.COMMAND, commands);
        } else {
          var commands = [];
          commands.push([waitingPlayer[1].id, 'state-pause', false]);
          this.redisPublisher.publish(this.redisPublisher.respEnum.COMMAND, commands);
        }

        syncPlayer.sync = Player.Sync.SYNCED;
      }

      var resumeRule = yield this.factory.createResumeRule();
      resumeRule.evaluate(waitingPlayer[1], this.playerManager, accuracy/4, broadcastResumeEvent);
    }
  }
});
