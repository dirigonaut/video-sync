var LogManager    = require('../../log/LogManager');
var PlayerManager = require('../../player/PlayerManager');
var Player        = require('../../player/Player');

var log           = LogManager.getLog(LogManager.LogEnum.STATE);
var playerManager = new PlayerManager();

function SyncingRule(fuzzyRange) {
  this.fuzzyRange = fuzzyRange;
}

SyncingRule.prototype.evaluate = function(issuer, callback) {
  log.info("SyncingRule.evaluate");
	var others = playerManager.getOtherPlayers(issuer.socket.id);
  var leader = null;

  for(var i in others){
    if(issuer.sync === Player.Sync.SYNCING) {
      if(leader === null || others[i].timestamp > leader.timestamp) {
        leader = others[i];
      }
    }
	}

  if(Math.abs(parseFloat(issuer.timestamp) - parseFloat(leader.timestamp)) > this.fuzzyRange) {
    callback(leader, issuer, "state-seek");
  }
};

module.exports = SyncingRule;
