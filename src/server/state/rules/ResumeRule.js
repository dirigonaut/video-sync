var PlayerManager = require('../player/PlayerManager');
var Player        = require('../player/Player');

var playerManager = new PlayerManager();

function ResumeRule(fuzzyRange) {
  this.fuzzyRange = fuzzyRange;
}

ResumeRule.prototype.evaluate = function(issuer, callback) {
  console.log("ResumeRule.evaluate");
	var others = playerManager.getOtherPlayers(issuer.socket.id);
  var rearguard = null;

  for(var i in others){
    if(others[i].sync == Player.Sync.SYNCED) {
      if(rearguard == null || parseFloat(others[i].timestamp) < parseFloat(rearguard.timestamp)) {
        rearguard = others[i];
      }
    }
	}

  if(rearguard !== null) {
    if(Math.abs(parseFloat(issuer.timestamp) - parseFloat(rearguard.timestamp)) < this.fuzzyRange) {
      callback(issuer, "state-play");
    }
  }
};

module.exports = ResumeRule;
