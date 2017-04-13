var LogManager    = require('../../log/LogManager');
var PlayerManager = require('../../player/PlayerManager');
var Player        = require('../../player/Player');

var log           = LogManager.getLog(LogManager.LogEnum.STATE);
var playerManager = new PlayerManager();

function ResumeRule(fuzzyRange) {
  this.fuzzyRange = fuzzyRange;
}

ResumeRule.prototype.evaluate = function(issuer, callback) {
  log.silly("ResumeRule.evaluate");
	var others = playerManager.getOtherPlayers(issuer.id);
  var rearguard = null;
  var waitguard = null;

  for(var i in others){
    if(rearguard === null || parseFloat(others[i].timestamp) < parseFloat(rearguard.timestamp)) {
      if(others[i].sync === Player.Sync.SYNCED) {
        rearguard = others[i];
      } else if(others[i].sync === Player.Sync.SYNCWAIT) {
        waitguard = others[i];
      }
    }
	}

  if(rearguard === null) {
    log.silly("There is no rearguard instead using waitguard.", waitguard);
    rearguard = waitguard;
  }

  if(rearguard !== null) {
    if((parseFloat(issuer.timestamp) - parseFloat(rearguard.timestamp)) < this.fuzzyRange) {
      log.silly("ResumeRule triggered for", issuer);
      callback(issuer);
    }
  } else {
    log.silly("ResumeRule triggered as there are no other users synced", issuer);
    callback(issuer);
  }
};

module.exports = ResumeRule;
