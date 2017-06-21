var Player        = require('../../player/Player');

function PlayRule() {
}

PlayRule.prototype.evaluate = function(issuer, playerManager, mediaStarted, fuzzyRange) {
  this.log.debug("PlayRule.evaluate");
	var players = playerManager.getPlayers();
  var issuees = [];

  if(issuer.sync === Player.Sync.DESYNCED) {
    log.silly("PlayRule triggered", [issuer]);
    return [issuer];
  } else {
    for(var player of players) {
      if(player[1].sync === Player.Sync.SYNCED || (mediaStarted === false && player[1].isInit())) {
        if(Math.abs(parseFloat(issuer.timestamp) - parseFloat(player[1].timestamp)) < fuzzyRange) {
          issuees.push(player[1]);
        }
      }
  	}
  }

  if(issuees.length > 0) {
    this.log.debug("PlayRule triggered", issuees);
    return issuees;
  }
};

module.exports = PlayRule;
