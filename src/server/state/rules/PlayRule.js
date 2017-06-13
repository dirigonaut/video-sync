var LogManager    = require('../../log/LogManager');
var Player        = require('../../player/Player');

var log           = LogManager.getLog(LogManager.LogEnum.STATE);

function PlayRule() {
}

PlayRule.prototype.evaluate = function(issuer, playerManager, mediaStarted, fuzzyRange, callback) {
  log.debug("PlayRule.evaluate");
  _this = this;

	var players = playerManager.getPlayers();
  var issuees = [];

  if(issuer.sync === Player.Sync.DESYNCED) {
    log.silly("PlayRule triggered", [issuer]);
    callback([issuer]);
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
    log.debug("PlayRule triggered", issuees);
    callback(issuees);
  }
};

module.exports = PlayRule;
