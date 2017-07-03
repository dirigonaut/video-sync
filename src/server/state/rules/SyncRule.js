var player, log;

function SyncRule() { }

SyncRule.prototype.initialize = function(force) {
  if(typeof SyncRule.prototype.protoInit === 'undefined') {
    SyncRule.prototype.protoInit = true;
    player          = this.factory.createPlayer();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.STATE);
  }
};

SyncRule.prototype.evaluate = function(issuer, players, fuzzyRange) {
  log.silly("SyncRule.evaluate");
  var sync = false;

  if(issuer.sync !== player.Sync.DESYNCED) {
    for(let player of players.values()){
      if(player.sync === player.Sync.SYNCED) {
        if(parseFloat(issuer.timestamp) > parseFloat(player.timestamp) && Math.abs(parseFloat(issuer.timestamp) - parseFloat(player.timestamp)) > fuzzyRange) {
          sync = true;
          break;
        }
      }
  	}
  }

  return sync;
};

module.exports = SyncRule;
