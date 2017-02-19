var LogManager    = require('../../log/LogManager');
var PlayerManager = require('../../player/PlayerManager');
var Player        = require('../../player/Player');

var log           = LogManager.getLog(LogManager.LogEnum.STATE);
var playerManager = new PlayerManager();

function SyncingRule() {
}

SyncingRule.prototype.evaluate = function(issuer, callback) {
  log.info("SyncingRule.evaluate");
  if(issuer.sync === Player.Sync.SYNCING) {
  	var others = playerManager.getOtherPlayers(issuer.socket.id);
    var leader = null;

    for(var i in others){
      if(others[i].sync === Player.Sync.SYNCED) {
        if(leader === null || others[i].timestamp > leader.timestamp) {
          leader = others[i];
        }
      }
    }

    if(leader !== null) {
      callback(leader, issuer, "state-seek");
    } else {
      callback(issuer, issuer, "state-seek");
    }
  }
};

module.exports = SyncingRule;
