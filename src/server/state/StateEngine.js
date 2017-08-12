const Promise = require('bluebird');

var player, playRule, syncRule, syncingRule, resumeRule, schemaFactory,
    playerManager, accuracy, interval, session, publisher, eventKeys, log;

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

    eventKeys       = this.factory.createKeys();

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

StateEngine.prototype.play = Promise.coroutine(function* (id) {
  log.debug(`StateEngine.play ${id}`);
  var commands;
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var mediaStarted = yield session.getMediaStarted();
    var issuer = playerManager.getPlayer(id);

    if(issuer) {
      if(player.desynced) {
        log.silly('StateEngine issuing play', issuer);
        commands = [];
        commands.push([issuer.id, eventKeys.PLAY]);
      } else {
        if(issuer.getAuth() === player.Auth.DEFAULT) {
          var players = playRule.evaluate(issuer, playerManager.getPlayers(), mediaStarted, accuracy);
          commands = [];

          for(var i = 0; i < players.length; ++i) {
            if(!players[i].desynced) {
              log.info(`StateEngine issuing play ${players[i].id}`);
              commands.push([players[i].id, eventKeys.PLAY]);

              if(mediaStarted === false) {
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
        var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [undefined, undefined, undefined]);
        commands.push([issuer.id, eventKeys.PAUSE, schema]);
      } else {
        if(issuer.getAuth() === player.Auth.DEFAULT) {
          commands = [];
          var players = playerManager.getPlayers();
          for(let player of players.values()) {
            if(!player.desynced) {
              var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [undefined, undefined, undefined]);
              commands.push([player.id, eventKeys.PAUSE, schema]);
              player.sync = player.Sync.SYNCED;
            }
          }
        }
      }
    }
  }

  return commands;
});

StateEngine.prototype.seek = Promise.coroutine(function* (id, data) {
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
        var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [undefined, data.timestamp, undefined]);
        commands.push([issuer.id, eventKeys.SEEK, schema]);
        issuer.timestamp = data.timestamp;
      } else {
        if(issuer.getAuth() === player.Auth.DEFAULT) {
          commands = [];
          var players = playerManager.getPlayers();
          for(let player of players.values()) {
            if(!player.desynced) {
              var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [undefined, data.timestamp, undefined]);
              commands.push([player.id, eventKeys.SEEK, schema]);

              if(mediaStarted === false) {
                player.sync       = player.Sync.BUFFWAIT;
                player.timestamp  = data.timestamp;
                player.buffered   = false;
              }
            }
          }
        }
      }
    }
  }

  return commands;
});

StateEngine.prototype.sync = Promise.coroutine(function* (id) {
  log.debug(`StateEngine.pauseSync ${id}`);
  var command;
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var issuer = playerManager.getPlayer(id);

    if(issuer) {
      if(!issuer.desynced && player.getAuth() === player.Auth.DEFAULT) {
        var players = playerManager.getPlayers();
        if(players.size > 1) {
          var syncTime;

          for(let player of players.values()) {
            if(!player.desynced) {
              if(!syncTime || (player.sync === player.Sync.SYNCED && syncTime > player.timestamp)) {
                syncTime = player.timestamp;
              }
            }
          }

          var command = [];
          var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [undefined, syncTime, undefined]);
          command.push([id, eventKeys.SEEK, schema]);
        }
      }
    }
  }
  return command;
});

StateEngine.prototype.changeSyncState = Promise.coroutine(function* (id, syncState) {
  log.debug(`StateEngine.changeSyncState for ${id}, to ${syncState.data}`);
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var player = playerManager.getPlayer(id);

    if(player) {
      if(syncState.data == true) {
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
      if(data) {
        if(typeof data.state !== 'undefined') {
          player.state = data.state ? player.State.PAUSE : player.State.PLAY;
        }
        if(typeof data.timestamp !== 'undefined') {
          player.timestamp = data.timestamp;
        }
        if(typeof data.buffered !== 'undefined') {
          player.buffered  = data.buffered;
        }
      }

      if(false) {
        var isMediaStarted = yield session.getMediaStarted();

        if(player.sync === player.Sync.SYNCING && isMediaStarted) {
          var leader = syncingRule.evaluate(player, playerManager.getOtherPlayers(player.id));

          if(leader) {
            commands = [];
            var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [object.play, leader.timestamp + 1, undefined]);
            commands.push([player.id, eventKeys.SEEK, object]);
          }
        } else if(player.sync === player.Sync.SYNCED) {
          var triggered = syncRule.evaluate(player, playerManager.getPlayers(), accuracy);

          if(triggered) {
            player.sync = player.Sync.SYNCWAIT;
            commands = [];
            var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [undefined, undefined, undefined]);
            commands.push([player.id, eventKeys.PAUSE, false]);
          }
        }
      }
    }
  }

  return commands;
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
          commands.push([waitingPlayer.id, eventKeys.PLAY]);
          //yield redisSocket.ping.apply(null, message[i]);
          //yield publisher.publish(publisher.RespEnum.COMMAND, commands);
        } else {
          var commands = [];
          var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [undefined, undefined, undefined]);
          commands.push([waitingPlayer.id, eventKeys.PAUSE, schema]);
          //yield publisher.publish(publisher.RespEnum.COMMAND, commands);
        }

        waitingPlayer.sync = player.Sync.SYNCED;
      }
    } else if(waitingPlayer.sync === player.Sync.BUFFWAIT) {
      canPlay = canPlay ? canPlay & waitingPlayer.buffer : waitingPlayer.buffer;
      canPlayList.push(waitingPlayer);
    }
  }

  if(canPlay && canPlayList.length > 0) {
    commands = [];

    for(var i in canPlayList) {
      if(!canPlayList[i].desynced) {
        log.info(`StateEngine issuing play ${canPlayList[i].id}`);
        commands.push([canPlayList[i].id, eventKeys.PLAY]);
        canPlayList[i].sync = player.Sync.SYNCED;
      }
    }

    //yield publisher.publish(publisher.RespEnum.COMMAND, commands);
  }
});
