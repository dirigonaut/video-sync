var Player        = require('../../player/Player');

var log;

function SyncingRule() { }

SyncingRule.prototype.initialize = function() {
  if(typeof SyncingRule.prototype.protoInit === 'undefined') {
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.STATE);
    SyncingRule.prototype.protoInit = true;
  }
};

SyncingRule.prototype.evaluate = function(issuer, others) {
  log.info("SyncingRule.evaluate", issuer);
  if(issuer.sync === Player.Sync.SYNCING) {
    var leader = null;

    for(var i in others){
      if(others[i].sync === Player.Sync.SYNCED) {
        if(leader === null || others[i].timestamp > leader.timestamp) {
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
