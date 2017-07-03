var player, log;

function SyncingRule() { }

SyncingRule.prototype.initialize = function() {
  if(typeof SyncingRule.prototype.protoInit === 'undefined') {
    SyncingRule.prototype.protoInit = true;
    player          = this.factory.createPlayer();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.STATE);
  }
};

SyncingRule.prototype.evaluate = function(issuer, others) {
  log.info("SyncingRule.evaluate", issuer);
  if(issuer.sync === player.Sync.SYNCING) {
    var leader;

    for(var i in others){
      if(others[i].sync === player.Sync.SYNCED) {
        if(!leader || others[i].timestamp > leader.timestamp) {
          leader = others[i];
        }
      }
    }

    if(leader) {
      log.info("SyncingRule triggered syncing to user", leader);
      return leader;
    } else {
      log.info("SyncingRule triggered as there is no leader syncing to user", issuer);
      return issuer;
    }
  }
};

module.exports = SyncingRule;
