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
  console.log(issuer)
  if(issuer.sync === issuer.Enums.SYNC.SYNCING) {
    var leader;

    for(var i = 0; i < others.length; ++i) {
      if(others[i].sync === others[i].Enums.SYNC.SYNCED) {
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
