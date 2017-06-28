var Player        = require('../../player/Player');

function SyncingRule() {
}

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
