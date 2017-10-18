var log;

function PlayRule() { }

PlayRule.prototype.initialize = function(force) {
  if(typeof PlayRule.prototype.protoInit === 'undefined') {
    PlayRule.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.STATE);
  }
};

PlayRule.prototype.evaluate = function(issuer, players, mediaStarted, fuzzyRange) {
  log.debug("PlayRule.evaluate");
  var issuees = [];

  for(let player of players.values()) {
    if(player && player.sync === player.Enums.SYNC.SYNCED || (mediaStarted === false)) {
      if(Math.abs(parseFloat(issuer.timestamp) - parseFloat(player.timestamp)) < fuzzyRange) {
        issuees.push(player);
      }
    }
  }

  if(issuees.length > 0) {
    log.debug("PlayRule triggered", issuees);
    return issuees;
  }
};

module.exports = PlayRule;
