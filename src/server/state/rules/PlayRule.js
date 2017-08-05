var player, log;

function PlayRule() { }

PlayRule.prototype.initialize = function(force) {
  if(typeof PlayRule.prototype.protoInit === 'undefined') {
    PlayRule.prototype.protoInit = true;
    player          = this.factory.createPlayer();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.STATE);
  }
};

PlayRule.prototype.evaluate = function(issuer, players, mediaStarted, fuzzyRange) {
  log.debug("PlayRule.evaluate");
  var issuees = [];

  if(issuer.desynced) {
    log.silly("PlayRule triggered", [issuer]);
    return [issuer];
  } else {
    for(let player of players.values()) {
      if(player.sync === player.Sync.SYNCED || (mediaStarted === false)) {
        if(Math.abs(parseFloat(issuer.timestamp) - parseFloat(player.timestamp)) < fuzzyRange) {
          issuees.push(player);
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
