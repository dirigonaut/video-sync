var Player        = require('../../player/Player');

var log;

function SyncRule() { }

SyncRule.prototype.initialize = function() {
  if(typeof SyncRule.prototype.protoInit === 'undefined') {
    SyncRule.prototype.protoInit = true;

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.STATE);
  }
};

SyncRule.prototype.evaluate = function(issuer, players, fuzzyRange) {
  log.silly("SyncRule.evaluate");
  var sync = false;

  if(issuer.sync !== Player.Sync.DESYNCED) {
    for(var player of players.values()){
      if(player.sync === Player.Sync.SYNCED) {
        if(parseFloat(issuer.timestamp) - parseFloat(player.timestamp) > fuzzyRange) {
          sync = true;
          break;
        }
      }
  	}
  }

  if(sync) {
    return true;
  }

  return false;
};

module.exports = SyncRule;
