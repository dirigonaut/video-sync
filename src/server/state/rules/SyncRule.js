const Promise = require('bluebird');

var media, redisSocket, eventKeys, log;

function SyncRule() { }

SyncRule.prototype.initialize = function(force) {
  if(typeof SyncRule.prototype.protoInit === 'undefined') {
    SyncRule.prototype.protoInit = true;
    media           = this.factory.createMedia();
    redisSocket     = this.factory.createRedisSocket();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.STATE);
  }
};

SyncRule.prototype.evaluate = Promise.coroutine(function* (players) {
  var rule      = yield media.getMediaRule();
  var stats     = { };

  for(let player of players.values()) {
    if(player.sync === player.Enums.SYNC.SYNCED) {
      if(!stats.rearGuard || player.timestamp < stats.rearGuard) {
        stats.rearGuard = player.timestamp;
      }

      if(!stats.foreGuard || player.timestamp > stats.foreGuard) {
        stats.foreGuard = player.timestamp;
      }
    }
	}

  try {
    stats.difference = stats.foreGuard - stats.rearGuard;

    //Not yielded as they do not need to be blocking.
    media.setPlayerMetrics(stats);
    redisSocket.broadcast.call(SyncRule.prototype, eventKeys.SYNCINFO, stats);

    if(parseFloat(rule)) {
      return parseFloat(rule) < stats.difference;
    }
  } catch(e) {
    log.error(e);
  }
});

module.exports = SyncRule;
