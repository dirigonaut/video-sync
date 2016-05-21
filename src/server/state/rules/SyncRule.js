function SyncRule(fuzzyRange) {
  this.fuzzyRange = fuzzyRange;
}

SyncRule.prototype.evaluate = function(issuer, callback) {
	var others  = playerManager.getOtherPlayers(player.socket.id);
  var trigger = true;


  if(trigger) {
    callback(others, "sync-pause");
  }
};

module.exports = SyncRule;
