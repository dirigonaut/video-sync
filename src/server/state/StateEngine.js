const Promise = require('bluebird');
const Events  = require('events');

const METRICSINTERVAL = 500;

var publisher, playRule, syncingRule, schemaFactory, redisSocket, autoSyncInterval,
    playerManager, trigger, accuracy, media, publisher, eventKeys, log;

function StateEngine() { };

StateEngine.prototype.initialize = function() {
  if(typeof StateEngine.prototype.protoInit === 'undefined') {
    StateEngine.prototype.protoInit = true;
    playerManager   = this.factory.createPlayerManager();
    media           = this.factory.createMedia();
    publisher       = this.factory.createRedisPublisher();
    redisSocket     = this.factory.createRedisSocket();
    trigger         = new Events();

    playRule        = this.factory.createPlayRule();
    syncingRule     = this.factory.createSyncingRule();

    schemaFactory   = this.factory.createSchemaFactory();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.STATE);

    autoSyncInterval = setInterval(Promise.coroutine(function* () {
      if(syncingRule.evaluate(playerManager.getPlayers())) {
        yield redisSocket.broadcast.apply(null, [eventKeys.PAUSE]);
      }
    }), METRICSINTERVAL);
  }
};

StateEngine.prototype.play = Promise.coroutine(function* (id) {
  log.debug(`StateEngine.play ${id}`);
  var commands;
  var basePath = yield media.getMediaPath();

  if(basePath && basePath.length > 0) {
    var mediaStarted = yield media.getMediaStarted();
    var issuer = playerManager.getPlayer(id);

    if(issuer) {
      var players = playRule.evaluate(issuer, playerManager.getPlayers(), mediaStarted, accuracy);
      if(players) {
        commands = [];
        var buffering = [];

        for(var i = 0; i < players.length; ++i) {
          log.info(`StateEngine issuing play ${players[i].id}`);
          buffering.push(players[i]);

          if(mediaStarted === false) {
            players[i].sync = player.Enums.SYNC.SYNCED;
          }
        }
        canPlay(buffering, player.Enums.STATE.PLAY);

        if(!mediaStarted) {
          yield media.setMediaStarted(!mediaStarted);
        }
      }
    }
  }

  return commands;
});

StateEngine.prototype.pause = Promise.coroutine(function* (id) {
  log.debug(`StateEngine.pause ${id}`);
  var commands;
  var basePath = yield media.getMediaPath();

  if(basePath && basePath.length > 0) {
    var issuer = playerManager.getPlayer(id);

    if(issuer) {
      commands = [];
      var players = playerManager.getPlayers();
      for(let player of players.entries()) {
        commands.push([player[0], eventKeys.PAUSE]);
        player[1].sync = player.Enums.SYNC.SYNCED;
      }
    }
  }

  return commands;
});

StateEngine.prototype.seek = Promise.coroutine(function* (id, data) {
  log.debug(`StateEngine.seek ${id}`);
  var commands;
  var basePath = yield media.getMediaPath();
  var mediaStarted = yield media.getMediaStarted();

  if(basePath && basePath.length > 0) {
    var issuer = playerManager.getPlayer(id);

    if(issuer) {
      commands = [];
      var buffering = [];
      var players = playerManager.getPlayers();

      for(let player of players.entries()) {
        buffering.push(player[1]);
        var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.STATERESPONSE, [false, data.timestamp]);
        commands.push([player[0], eventKeys.SEEK, schema]);

        if(mediaStarted === false) {
          player[1].sync       = player.Enums.SYNC.BUFFWAIT;
          player[1].timestamp  = data.timestamp;
          player[1].buffered   = false;
        }
      }

      canPlay(buffering, issuer.state);
    }
  }

  return commands;
});

StateEngine.prototype.sync = Promise.coroutine(function* (id) {
  log.debug(`StateEngine.sync ${id}`);
  var command;
  var basePath = yield media.getMediaPath();

  if(basePath && basePath.length > 0) {
    var issuer = playerManager.getPlayer(id);

    if(issuer) {
      var players = playerManager.getPlayers();
      if(players.size > 1) {
        var syncTime;

        for(let player of players.values()) {
          if(!syncTime || (player.sync === player.Enums.SYNC.SYNCED && syncTime > player.timestamp)) {
            syncTime = player.timestamp;
          }
        }

        var command = [];
        var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATERESPONSE, [false, syncTime]);
        command.push([id, eventKeys.SEEK, schema]);
      }
    }
  }

  return command;
});

StateEngine.prototype.syncingPing = Promise.coroutine(function* (id, data) {
  log.debug(`StateEngine.syncingPing ${id}`, data);
  var commands;
  var basePath = yield media.getMediaPath();
  var mediaStarted = yield media.getMediaStarted();

  if(basePath && basePath.length > 0 && mediaStarted) {
    var player = playerManager.getPlayer(id);

    if(player) {
      if(data) {
        if(typeof data.state !== 'undefined') {
          player.state = data.state ? player.Enums.STATE.PLAY : player.Enums.STATE.PAUSE;
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

      if(player.sync === player.Enums.SYNC.SYNCING) {
        var leader = syncingRule.evaluate(player, playerManager.getOtherPlayers(player.id));

        if(leader) {
          commands = [];
          var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.SCHEMAS.STATERESPONSE,
            leader.state === player.Enums.STATE.PLAY ? [true, leader.timestamp + 1] : [false, leader.timestamp]);
          commands.push([player.id, eventKeys.SEEK, schema]);
          player.sync = player.Enums.SYNC.SYNCED;
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
    players[i].sync = player.Enums.SYNC.BUFFWAIT;
    buffering[players[i].id] = players[i].id;
  }

  var canPlayLogic = function(id) {
    log.debug(`StateEngine player: ${id} canPlay.`);
    delete buffering[id];

    if(Object.entries(buffering).length === 0) {
      trigger.removeAllListeners('canPlay');

      for(let i = 0; i < players.length; ++i) {
        players[i].sync = player.Enums.SYNC.SYNCED;
        publisher.publish(publisher.Enums.Resp.COMMAND, [players[i].id, state === player.Enums.STATE.PLAY ? eventKeys.PLAY : eventKeys.PAUSE]);
      }
    }
  };

  if(Object.entries(buffering).length > 0) {
    log.debug(`StateEngine all players canPlay.`);
    trigger.removeAllListeners('canPlay');
    trigger.on('canPlay', canPlayLogic);
  }
};
