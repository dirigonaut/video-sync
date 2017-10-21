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
  var issuees = new Map();

  for(let player of players.entries()) {
    if(player[1] && player[1].sync === player[1].Enums.SYNC.SYNCED || !mediaStarted) {
      if(Math.abs(parseFloat(issuer.timestamp) - parseFloat(player[1].timestamp)) < fuzzyRange) {
        issuees.set(player[0], player[1]);
      }
    }
  }

  if(issuees.size > 0) {
    log.debug("PlayRule triggered", issuees);
    return issuees;
  }
};

module.exports = PlayRule;
