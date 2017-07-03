var Player        = require('../../player/Player');

var log;

function PlayRule() { }

PlayRule.prototype.initialize = function() {
  if(typeof PlayRule.prototype.protoInit === 'undefined') {
    PlayRule.prototype.protoInit = true;

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.STATE);
  }
};

PlayRule.prototype.evaluate = function(issuer, players, mediaStarted, fuzzyRange) {
  log.debug("PlayRule.evaluate");
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
    log.debug("PlayRule triggered", issuees);
    return issuees;
  }
};

module.exports = PlayRule;
