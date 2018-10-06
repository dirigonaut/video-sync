const Promise = require('bluebird');

const METRICSINTERVAL = 500;
const DEFAULTMEDIARULE = 3;

var publisher, stateLeader, schemaFactory, redisSocket, metricInterval,
    playerManager, playerInfo, credentials, media, publisher, eventKeys, log;

function StateEngine() { };

StateEngine.prototype.initialize = function() {
  if(typeof StateEngine.prototype.protoInit === 'undefined') {
    StateEngine.prototype.protoInit = true;
    playerManager   = this.factory.createPlayerManager();
    media           = this.factory.createMedia();
    publisher       = this.factory.createRedisPublisher();
    redisSocket     = this.factory.createRedisSocket();
    credentials     = this.factory.createCredentialManager();

    stateLeader     = this.factory.createStateLeader();
    playerInfo      = this.factory.getPlayerInfo();

    schemaFactory   = this.factory.createSchemaFactory();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.STATE);
  }
};

StateEngine.prototype.play = Promise.coroutine(function* () {
  log.debug(`StateEngine.play`);
  var basePath = yield media.getMediaPath();

  if(basePath && basePath.length > 0) {
    var commands = [];
    var results;

    var initedMedia = yield mediaStarted();
    if(initedMedia) {
      results = getMinMaxSyncedPlayers(
        [playerInfo.Enums.SYNC.SYNCING, playerInfo.Enums.SYNC.ISSUED],
        function(id, player) {
          player.sync = playerInfo.Enums.SYNC.SYNCED;
        });
    } else {
      results = getMinMaxSyncedPlayers([playerInfo.Enums.SYNC.SYNCED]);
    }

    var rule = yield media.getMediaRule();
    rule = rule ? rule : DEFAULTMEDIARULE;

    for(let i in results.ids) {
      player = playerManager.getPlayer(results.ids[i]);
      commands.push([results.ids[i], eventKeys.PLAY]);
    }

    if(Math.abs(results.max - results.min) > rule) {
      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.LOGRESPONSE,
        [new Date().toLocaleTimeString(), 'notify', 'state', `Play request failed.`]);
      yield redisSocket.broadcast.call(StateEngine.prototype, eventKeys.NOTIFICATION, response);

      delete commands;
    } else {
      log.info(`StateEngine issuing play for: `, commands);
    }

    return commands;
  }
});

StateEngine.prototype.pause = Promise.coroutine(function* () {
  log.debug(`StateEngine.pause`);
  var basePath = yield media.getMediaPath();

  if(basePath && basePath.length > 0) {
    var commands = [];
    var players = playerManager.getPlayers();
    for(let player of players.entries()) {
      commands.push([player[0], eventKeys.PAUSE]);
    }
  }

  return commands;
});

StateEngine.prototype.seek = Promise.coroutine(function* (data) {
  log.debug(`StateEngine.seek`);
  var basePath = yield media.getMediaPath();
  var mediaStarted = yield media.getMediaStarted();

  if(basePath && basePath.length > 0) {
    var commands = [];
    var players = playerManager.getPlayers();

    for(let player of players.entries()) {
      var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.STATERESPONSE, [false, data.timestamp]);
      commands.push([player[0], eventKeys.SEEK, schema]);
      player[1].sync       = playerInfo.Enums.SYNC.ISSUED;
      player[1].timestamp  = data.timestamp;
      player[1].buffer     = false;
    }
  }

  return commands;
});

StateEngine.prototype.sync = Promise.coroutine(function* () {
  log.debug(`StateEngine.sync`);
  var basePath = yield media.getMediaPath();

  if(basePath && basePath.length > 0) {
    var results = getMinMaxSyncedPlayers([playerInfo.Enums.SYNC.SYNCED], function(id, player) {
      player.sync = playerInfo.Enums.SYNC.ISSUED;
    });

    var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.STATERESPONSE, [false, results.min]);
    var command = [[eventKeys.SEEK, schema]];
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
          player.state = data.state ? playerInfo.Enums.STATE.PLAY : playerInfo.Enums.STATE.PAUSE;
        }
        if(typeof data.timestamp !== 'undefined') {
          player.timestamp = data.timestamp;
        }
        if(typeof data.buffered !== 'undefined') {
          player.buffer = data.buffered;
        }
      }

      var rule = yield media.getMediaRule();
      rule = rule ? rule : DEFAULTMEDIARULE;
      var leader = stateLeader.getLeader(rule);

      if(player.sync === playerInfo.Enums.SYNC.ISSUED) {
        if(Math.abs(leader.timestamp - player.timestamp) <= rule && player.buffer) {
          if(player.state !== leader.state) {
            commands = [[id, leader.state ? eventKeys.PLAY : eventKeys.PAUSE ]];
          }

          player.sync = playerInfo.Enums.SYNC.SYNCED;
        }
      } else if (player.sync === playerInfo.Enums.SYNC.SYNCING) {
        if(Math.abs(leader.timestamp - player.timestamp) > rule) {
          var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.STATERESPONSE,
              leader.state === playerInfo.Enums.STATE.PLAY ? [true, leader.timestamp + 1] : [false, leader.timestamp]);
          commands = [[id, eventKeys.SEEK, schema]];
        }

        player.sync = playerInfo.Enums.SYNC.ISSUED;
      }
    }
  }

  return commands;
});

StateEngine.prototype.syncingAll = Promise.coroutine(function* () {
  var players = playerManager.getPlayers();

  for(var key of players.keys()) {
    this.syncing(key);
  }
});

StateEngine.prototype.syncing = Promise.coroutine(function* (id) {
  log.silly(`StateEngine.syncing ${id}`);
  var player = playerManager.getPlayer(id);

  if(player) {
    player.sync = playerInfo.Enums.SYNC.SYNCING;
  }
});

module.exports = StateEngine;

var mediaStarted = Promise.coroutine(function* () {
  log.silly(`StateEngine._mediaStarted`);
  var mediaStarted = yield media.getMediaStarted();

  if(!mediaStarted) {
    yield media.setMediaStarted(true);
    metricInterval !== 'undefined' ? clearInterval(metricInterval) : undefined;
    metricInterval = createMetricInterval.call(this);
    return true;
  }
});

var createMetricInterval = function() {
  return setInterval(Promise.coroutine(function* () {
    var isPlaying = false;
    var players = playerManager.getPlayers();
    var results = getMinMaxSyncedPlayers([playerInfo.Enums.SYNC.ISSUED, playerInfo.Enums.SYNC.SYNCED],
                      function(id, player) { isPlaying = isPlaying ? isPlaying : player.state; });

    var rule = yield media.getMediaRule();
    rule = rule ? rule : DEFAULTMEDIARULE;

    var stats = {rearGuard: results.min, foreGuard: results.max, difference: Math.abs(results.max - results.min)};
    media.setPlayerMetrics(stats);
    redisSocket.broadcast.call(this, eventKeys.SYNCINFO, stats);

    if(stats.difference > rule && isPlaying) {
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

var getMinMaxSyncedPlayers = function(states, custom) {
  var results = {};
  results.ids = [];
  var players = playerManager.getPlayers();

  if(players && players.size) {
    var min, max;
    for(let player of players.entries()) {
      if(states.includes(player[1].sync)) {
        min = min !== undefined ? Math.min(min, player[1].timestamp) : player[1].timestamp;
        max = max !== undefined ? Math.max(max, player[1].timestamp) : player[1].timestamp;
        results.ids.push(player[0]);
      }

      if(custom && typeof custom === "function") {
        custom.apply(null, player);
      }
    }
  }

  results.min = min;
  results.max = max;
  return results
};
