var PlayerManager = require('../player/PlayerManager');

var playerManager = new PlayerManager();

function SyncRule(fuzzyRange) {
  this.fuzzyRange = fuzzyRange;
}

SyncRule.prototype.evaluate = function(issuer, callback) {
	var others  = playerManager.getOtherPlayers(issuer.socket.id);
  var trigger = true;

  for (var i in others){
		trigger = trigger && (Math.abs(parseFloat(issuer.timestamp) - parseFloat(others[i].timestamp)) > this.fuzzyRange);
	}

  if(trigger) {
    callback(playerManager.getPlayers(), "state-pause");
  }
};

module.exports = SyncRule;
