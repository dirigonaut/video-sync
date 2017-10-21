const Promise = require('bluebird');

var media, log;

function SyncRule() { }

SyncRule.prototype.initialize = function(force) {
  if(typeof SyncRule.prototype.protoInit === 'undefined') {
    SyncRule.prototype.protoInit = true;
    media           = this.factory.createMedia();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.STATE);
  }
};

SyncRule.prototype.evaluate = Promise.coroutine(function* (players) {
  var ruleInfo  = yield media.getMediaRule();
  var stats       = { };

  for(let player of players.values()) {
    if(player.sync === player.Enums.SYNC.SYNCED) {
      if(!stats.rearGuard || player.timestamp < stats.rearGuard) {
        stats.rearGuard = player.timestamp;
      } else if(!stats.foreGuard || player.timestamp > stats.foreGuard) {
        stats.foreGuard = player.timestamp;
      }

      stats.average = stats.average !== 'undefined' ? player.timestamp : stats.average + player.timestamp;
    }
	}

  try {
    if(players.size > 1) {
      stats.average = stats.average / players.size;
      stats.difference = stats.foreGuard - stats.rearGuard;
      yield media.setPlayerMetrics(stats);

      if(ruleInfo) {
        var range = typeof ruleInfo.range !== undefined? ruleInfo.range : 3;
        return ruleInfo.active && range > stats.difference;
      }
    }
  } catch(e) {
    log.error(e);
  }
});

module.exports = SyncRule;
