var PlayerManager = require('../player/PlayerManager');

var playerManager = new PlayerManager();

function PlayRule(fuzzyRange) {
  this.fuzzyRange = fuzzyRange;
}

PlayRule.prototype.evaluate = function(issuer, callback) {
  console.log("PlayRule.evaluate");
	var others  = playerManager.getOtherPlayers(issuer.socket.id);
  var trigger = true;
  console.log(others);

	for (var i in others){
    console.log("Issuer: " + parseFloat(issuer.timestamp) + " Other: " + parseFloat(others[i].timestamp));
    console.log(Math.abs(parseFloat(issuer.timestamp) - parseFloat(others[i].timestamp)) + " < " + this.fuzzyRange);
		trigger = trigger && (Math.abs(parseFloat(issuer.timestamp) - parseFloat(others[i].timestamp)) < this.fuzzyRange);
	}

  if(trigger) {
    callback();
  }
};

module.exports = PlayRule;
