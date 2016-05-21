function PlayRule(fuzzyRange) {
  this.fuzzyRange = fuzzyRange;
}

PlayRule.prototype.evaluate = function(issuer, callback) {
	var others  = playerManager.getOtherPlayers(player.socket.id);
  var trigger = true;

	for (var i in others){
		trigger &= (Math.abs(parseFloat(issuer.timestamp) - parseFloat(others[i].timestamp)) < this.fuzzyRange);
	}

  if(trigger) {
    callback();
  }
};

module.exports = PlayRule;
