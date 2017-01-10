var PlayerManager = require('../../player/PlayerManager');
var Player        = require('../../player/Player');
var Session       = require('../../administration/Session');

var playerManager = new PlayerManager();
var session       = new Session();

function PlayRule(fuzzyRange) {
  this.fuzzyRange = fuzzyRange;
}

PlayRule.prototype.evaluate = function(issuer, callback) {
  console.log("PlayRule.evaluate");
	var players = playerManager.getPlayers();
  var issuees = [];

  if(issuer.sync == Player.Sync.DESYNCED || (session.getMediaStarted() == true && issuer.isInit())) {
    callback([issuer]);
  } else {
    for(var player of players) {
      if(player[1].sync == Player.Sync.SYNCED || (session.getMediaStarted() == false && player[1].isInit())) {
        if(Math.abs(parseFloat(issuer.timestamp) - parseFloat(player[1].timestamp)) < this.fuzzyRange) {
          issuees.push(player[1]);
        }
      }
  	}
  }

  if(issuees.length > 0) {
    callback(issuees);
  }
};

module.exports = PlayRule;
