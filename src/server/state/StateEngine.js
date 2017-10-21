const Promise = require('bluebird');
const Events  = require('events');

const METRICSINTERVAL = 500;

var publisher, playRule, syncingRule, syncRule, schemaFactory, redisSocket,
    metricInterval, playerManager, trigger, media, publisher, eventKeys, log;

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
    syncRule        = this.factory.createSyncRule();

    schemaFactory   = this.factory.createSchemaFactory();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.STATE);
  }
};

StateEngine.prototype.play = Promise.coroutine(function* (id) {
  log.debug(`StateEngine.play ${id}`);
  var basePath = yield media.getMediaPath();
  var result;

  if(basePath && basePath.length > 0) {
    var mediaStarted = yield media.getMediaStarted();
    var ruleInfo = yield media.getMediaRule();
    var issuer = playerManager.getPlayer(id);

    if(issuer) {
      var players = playRule.evaluate(issuer, playerManager.getPlayers(), mediaStarted, ruleInfo && typeof ruleInfo.range !== 'undefined' ? ruleInfo.range : 3);
      result = true;
      
      if(players) {
        var buffering = new Map();

        for(var player of players.entries()) {
          log.info(`StateEngine issuing play ${player[0]}`);
          buffering.set(player[0], player[1]);

          if(mediaStarted === false) {
            player[1].sync = player[1].Enums.SYNC.SYNCED;
          }
        }
        canPlay.call(this, buffering, issuer.Enums.STATE.PLAY);

        if(!mediaStarted) {
          yield media.setMediaStarted(!mediaStarted);
          metricInterval !== 'undefined' ? clearInterval(metricInterval) : undefined;
          metricInterval = createMetricInterval.call(this);
        }
      }
    }
  }

  return result;
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
        player[1].sync = player[1].Enums.SYNC.SYNCED;
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
      var buffering = new Map();
      var players = playerManager.getPlayers();

      for(let player of players.entries()) {
        buffering.set(player[0], player[1]);
        var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.STATERESPONSE, [false, data.timestamp]);
        commands.push([player[0], eventKeys.SEEK, schema]);

        if(mediaStarted === false) {
          player[1].sync       = player[1].Enums.SYNC.BUFFWAIT;
          player[1].timestamp  = data.timestamp;
          player[1].buffered   = false;
        }
      }

      canPlay.call(this, buffering, issuer.state);
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

        command = [];
        var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.STATERESPONSE, [false, syncTime]);
        command.push([id, eventKeys.SEEK, schema]);
      }
    }
  }

  return command;
});

StateEngine.prototype.syncingPing = Promise.coroutine(function* (id, data) {
  log.silly(`StateEngine.syncingPing ${id}`, data);
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
          var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.STATERESPONSE,
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
  var buffering = new Map();

  for(let player of players.entries()) {
    player[1].sync = player[1].Enums.SYNC.BUFFWAIT;
    buffering.set(player[0], player[1].id);
  }

  var canPlayLogic = function(id) {
    log.debug(`StateEngine player: ${id} canPlay.`);
    buffering.delete(id);

    if(buffering.size === 0) {
      for(let player of players.values()) {
        player.sync = player.Enums.SYNC.SYNCED;
        redisSocket.ping.apply(this, [id, state === player.Enums.STATE.PLAY ? eventKeys.PLAY : eventKeys.PAUSE]);
      }

      trigger.removeAllListeners('canPlay');
    }
  }.bind(this);

  if(buffering.size > 0) {
    log.debug(`StateEngine all players canPlay.`);
    trigger.removeAllListeners('canPlay');
    trigger.on('canPlay', canPlayLogic);
  }
};

var createMetricInterval = function() {
  return setInterval(Promise.coroutine(function* () {
    var metrics = yield media.getPlayerMetrics();
    yield redisSocket.broadcast.apply(this, [eventKeys.PLAYERINFO, metrics]);

    if(syncRule.evaluate(playerManager.getPlayers()) === true) {
      yield redisSocket.broadcast.apply(this, [eventKeys.PAUSE]);
    }
  }.bind(this)), 1000);
};
