var LogManager    = require('../../log/LogManager');
var Player        = require('../../player/Player');

var log           = LogManager.getLog(LogManager.LogEnum.STATE);

function ResumeRule(fuzzyRange) {
  this.fuzzyRange = fuzzyRange;
}

ResumeRule.prototype.evaluate = function(issuer, others) {
  log.silly("ResumeRule.evaluate");
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

  if(rearguard) {
    if((parseFloat(issuer.timestamp) - parseFloat(rearguard.timestamp)) < this.fuzzyRange) {
      log.info("ResumeRule triggered for", issuer);
      return true;
    }
  } else {
    log.silly("ResumeRule triggered as there are no other users synced", issuer);
    return true;
  }

  return false;
};

module.exports = ResumeRule;
