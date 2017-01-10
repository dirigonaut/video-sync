var PlayerManager = require('../../player/PlayerManager');
var Player        = require('../../player/Player');

var playerManager = new PlayerManager();

function JoinRule(fuzzyRange) {
  this.fuzzyRange = fuzzyRange;
}

JoinRule.prototype.evaluate = function(issuer, callback) {
  console.log("JoinRule.evaluate");
	var others = playerManager.getOtherPlayers(issuer.socket.id);
  var leader = null;

  for(var i in others){
    if(issuer.sync == Player.Sync.SYNCING) {
      if(leader == null || others[i].timestamp > leader.timestamp) {
        leader = others[i];
      }
    }
	}

  if(Math.abs(parseFloat(issuer.timestamp) - parseFloat(leader.timestamp)) > this.fuzzyRange) {
    callback(leader, issuer, "state-seek");
  }
};

module.exports = JoinRule;
