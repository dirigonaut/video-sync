var player, log;

function ResumeRule() { }

ResumeRule.prototype.initialize = function() {
  if(typeof ResumeRule.prototype.protoInit === 'undefined') {
    ResumeRule.prototype.protoInit = true;
    player          = this.factory.createPlayer();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.STATE);
  }
};

ResumeRule.prototype.evaluate = function(issuer, others) {
  log.silly("ResumeRule.evaluate");
  var rearguard;
  var waitguard;

  for(var i in others){
    if(rearguard || parseFloat(others[i].timestamp) < parseFloat(rearguard.timestamp)) {
      if(others[i].sync === player.Sync.SYNCED) {
        rearguard = others[i];
      } else if(others[i].sync === player.Sync.SYNCWAIT) {
        waitguard = others[i];
      }
    }
	}

  if(!rearguard) {
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
