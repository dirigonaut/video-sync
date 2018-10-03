const Promise = require('bluebird');
const Events  = require('events');

const METRICSINTERVAL = 500;

var publisher, playRule, syncingRule, syncRule, schemaFactory, redisSocket,
    metricInterval, playerManager, credentials, trigger, media, publisher,
    eventKeys, log;

function StateEngine() { };

StateEngine.prototype.initialize = function() {
  if(typeof StateEngine.prototype.protoInit === 'undefined') {
    StateEngine.prototype.protoInit = true;
    playerManager   = this.factory.createPlayerManager();
    media           = this.factory.createMedia();
    publisher       = this.factory.createRedisPublisher();
    redisSocket     = this.factory.createRedisSocket();
    credentials     = this.factory.createCredentialManager();
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

  if(basePath && basePath.length > 0) {
    var mediaStarted = yield media.getMediaStarted();
    var rule = yield media.getMediaRule();
    var issuer = playerManager.getPlayer(id);

    if(issuer) {
      var players = playRule.evaluate(issuer, playerManager.getPlayers(), mediaStarted, rule ? rule : 3);

      if(players) {
        var buffering = new Map();

        log.info(`StateEngine issuing play for: `, players);
        for(var player of players.entries()) {
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

        return true;
      }
    }
  }
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
          player[1].buffer     = false;
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
          player.buffer = data.buffered;

          if(trigger && data.buffered) {
            trigger.emit('canPlay', id);
          }
        }
      }

      if(player.sync === player.Enums.SYNC.SYNCING) {
        var leader = syncingRule.evaluate(player, playerManager.getOtherPlayers(id));

        if(leader) {
          commands = [];
          var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.STATERESPONSE,
            leader.state === player.Enums.STATE.PLAY ? [true, leader.timestamp + 1] : [false, leader.timestamp]);
          commands.push([id, eventKeys.SEEK, schema]);
          player.sync = player.Enums.SYNC.SYNCED;
        }
      }
    }
  }

  return commands;
});

StateEngine.prototype.syncingAll = Promise.coroutine(function* () {
  log.silly(`StateEngine.syncingAll`);
  var players = playerManager.getPlayers();

  for(var key of players.keys()) {
    this.syncing(key);
  }
});

StateEngine.prototype.syncing = Promise.coroutine(function* (id) {
  log.silly(`StateEngine.syncing ${id}`);
  var basePath = yield media.getMediaPath();
  var mediaStarted = yield media.getMediaStarted();

  if(basePath && basePath.length > 0 && mediaStarted) {
    var player = playerManager.getPlayer(id);

    if(player) {
      player.sync = player.Enums.SYNC.SYNCING;
    }
  }
});

module.exports = StateEngine;

var canPlay = function(players, state) {
  var buffering = new Map();

  for(let player of players.entries()) {
    player[1].sync = player[1].Enums.SYNC.BUFFWAIT;
    buffering.set(player[0], player[1]);
  }

  var canPlayLogic = function(id) {
    log.debug(`StateEngine player canPlay.`, id);
    buffering.delete(id);

    if(buffering.size === 0) {
      log.debug(`StateEngine players canplay:`, players);
      for(let player of players.entries()) {
        player[1].sync = player[1].Enums.SYNC.SYNCED;
        redisSocket.ping.apply(this, [player[0], state === player[1].Enums.STATE.PLAY ? eventKeys.PLAY : eventKeys.PAUSE]);
      }

      trigger.removeAllListeners('canPlay');
    }
  }.bind(this);

  if(buffering.size > 0) {
    trigger.removeAllListeners('canPlay');
    trigger.on('canPlay', canPlayLogic);
  }
};

var createMetricInterval = function() {
  return setInterval(Promise.coroutine(function* () {
    var players = playerManager.getPlayers();
    var triggered = yield syncRule.evaluate(players);

    if(triggered) {
      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.LOGRESPONSE,
        [new Date().toLocaleTimeString(), 'notify', 'state', `Auto Sync issued pause.`]);
      yield redisSocket.broadcast.call(StateEngine.prototype, eventKeys.NOTIFICATION, response);
      yield redisSocket.broadcast.call(this, eventKeys.PAUSE);
    }

    credentials.getAdmin().then(function(admin) {
      if(admin && admin.id) {
        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.RESPONSE, [Array.from(players.entries())]);
        redisSocket.ping.call(this, admin.id, eventKeys.ADMINSTATS, response);
      }
    });
  }.bind(this)), 500);
};
