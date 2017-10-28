var log;

function SyncingRule() { }

SyncingRule.prototype.initialize = function(force) {
  if(typeof SyncingRule.prototype.protoInit === 'undefined') {
    SyncingRule.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.STATE);
  }
};

SyncingRule.prototype.evaluate = function(issuer, others) {
  log.info("SyncingRule.evaluate", issuer);
  if(issuer.sync === issuer.Enums.SYNC.SYNCING) {
    var leader;

    for(var player of others.values()) {
      if(player.sync === player.Enums.SYNC.SYNCED) {
        if(leader === undefined || player.timestamp > leader.timestamp) {
          leader = player;
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
