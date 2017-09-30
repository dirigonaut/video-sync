const Promise = require('bluebird');
const Events  = require('events');

var player, publisher, playRule, syncingRule, schemaFactory,
    playerManager, trigger, accuracy, session, publisher, eventKeys, log;

function StateEngine() { };

StateEngine.prototype.initialize = function(force) {
  if(typeof StateEngine.prototype.protoInit === 'undefined') {
    StateEngine.prototype.protoInit = true;
    schemaFactory   = this.factory.createSchemaFactory();
    player          = this.factory.createPlayer();

    playRule        = this.factory.createPlayRule();
    syncingRule     = this.factory.createSyncingRule();

    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.STATE);
  }

	if(force === undefined ? typeof StateEngine.prototype.stateInit === 'undefined' : force) {
    StateEngine.prototype.stateInit = true;
    playerManager   = this.factory.createPlayerManager();
    session         = this.factory.createSession();
    publisher       = this.factory.createRedisPublisher();
    trigger         = new Events();

    accuracy = 2;
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
      if(issuer.isDesynced()) {
        log.silly('StateEngine issuing play', issuer);
        commands = [];
        commands.push([issuer.id, eventKeys.PLAY]);
      } else {
        if(issuer.getAuth() === player.Auth.DEFAULT) {
          var players = playRule.evaluate(issuer, playerManager.getPlayers(), mediaStarted, accuracy);
          if(players) {
            commands = [];
            var buffering = [];

            for(var i = 0; i < players.length; ++i) {
              if(!players[i].isDesynced()) {
                log.info(`StateEngine issuing play ${players[i].id}`);
                buffering.push(players[i]);

                if(mediaStarted === false) {
                  players[i].sync = player.Sync.SYNCED;
                }
              }
            }
            canPlay(buffering, player.State.PLAY);

            if(!mediaStarted) {
              yield session.setMediaStarted(!mediaStarted);
            }
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
      if(issuer.isDesynced()) {
        log.silly('StateEngine issuing pause', issuer);
        commands = [];
        commands.push([issuer.id, eventKeys.PAUSE]);
      } else {
        if(issuer.getAuth() === player.Auth.DEFAULT) {
          commands = [];
          var players = playerManager.getPlayers();
          for(let player of players.values()) {
            if(!player.isDesynced()) {
              commands.push([player.id, eventKeys.PAUSE]);
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
      if(issuer.isDesynced()) {
        log.silly('StateEngine issuing pause', issuer);
        commands = [];
        var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [issuer.state, data.timestamp]);
        commands.push([issuer.id, eventKeys.SEEK, schema]);
        issuer.timestamp = data.timestamp;
      } else {
        if(issuer.getAuth() === player.Auth.DEFAULT) {
          commands = [];
          var buffering = [];
          var players = playerManager.getPlayers();

          for(let player of players.values()) {
            if(!player.isDesynced()) {
              buffering.push(player);
              var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [false, data.timestamp]);
              commands.push([player.id, eventKeys.SEEK, schema]);

              if(mediaStarted === false) {
                player.sync       = player.Sync.BUFFWAIT;
                player.timestamp  = data.timestamp;
                player.buffered   = false;
              }
            }
          }

          canPlay(buffering, issuer.state);
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
      if(!issuer.isDesynced()) {
        var players = playerManager.getPlayers();
        if(players.size > 1) {
          var syncTime;

          for(let player of players.values()) {
            if(!player.isDesynced()) {
              if(!syncTime || (player.sync === player.Sync.SYNCED && syncTime > player.timestamp)) {
                syncTime = player.timestamp;
              }
            }
          }

          var command = [];
          var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [false, syncTime]);
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
        player.sync = player.Sync.SYNCING;
      } else {
        player.sync = player.Sync.DESYNCED;
      }

      return syncState.data;
    }
  }
});

StateEngine.prototype.syncingPing = Promise.coroutine(function* (id, data) {
  log.debug(`StateEngine.syncingPing ${id}`, data);
  var commands;
  var basePath = yield session.getMediaPath();
  var mediaStarted = yield session.getMediaStarted();

  if(basePath && basePath.length > 0 && mediaStarted) {
    var player = playerManager.getPlayer(id);

    if(player) {
      if(data) {
        if(typeof data.state !== 'undefined') {
          player.state = data.state ? player.State.PLAY : player.State.PAUSE;
        }
        if(typeof data.timestamp !== 'undefined') {
          player.timestamp = data.timestamp;
        }
        if(typeof data.buffered !== 'undefined') {
          player.buffered = data.buffered;

          if(trigger && data.buffered) {
            trigger.emit('canPlay', id);
          }
        }
      }

      if(player.sync === player.Sync.SYNCING) {
        var leader = syncingRule.evaluate(player, playerManager.getOtherPlayers(player.id));

        if(leader) {
          commands = [];
          var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE,
            leader.state === player.State.PLAY ? [true, leader.timestamp + 1] : [false, leader.timestamp]);
          commands.push([player.id, eventKeys.SEEK, schema]);
          player.sync = player.Sync.SYNCED;
        }
      }
    }
  }

  return commands;
});

module.exports = StateEngine;

var canPlay = function(players, state) {
  var buffering = {};

  for(let i = 0; i < players.length; ++i) {
    players[i].state = player.State.BUFFWAIT;
    buffering[players[i].id] = players[i].id;
  }

  var canPlayLogic = function(id) {
    log.debug(`StateEngine player: ${id} canPlay.`);
    delete buffering[id];

    if(Object.entries(buffering).length === 0) {
      trigger.removeAllListeners('canPlay');

      for(let i = 0; i < players.length; ++i) {
        players[i].state = player.State.SYNCED;
        publisher.publish(publisher.RespEnum.COMMAND, [players[i].id, state === player.State.PLAY ? eventKeys.PLAY : eventKeys.PAUSE]);
      }
    }
  };

  if(Object.entries(buffering).length > 0) {
    log.debug(`StateEngine all players canPlay.`);
    trigger.removeAllListeners('canPlay');
    trigger.on('canPlay', canPlayLogic);
  }
};
