var player, log;

function ResumeRule() { }

ResumeRule.prototype.initialize = function(force) {
  if(typeof ResumeRule.prototype.protoInit === 'undefined') {
    ResumeRule.prototype.protoInit = true;
    player          = this.factory.createPlayer();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.STATE);
  }
};

ResumeRule.prototype.evaluate = function(issuer, others, fuzzyRange) {
  log.silly("ResumeRule.evaluate");
  var result = false;
  var rearguard;
  var waitguard;

  for(var i in others) {
    log.silly(`${!rearguard} || ${others[i].handle}:${parseFloat(others[i].timestamp)} < ${rearguard ? rearguard.handle : null}:${rearguard ? parseFloat(rearguard.timestamp) : null}`);
    if(!rearguard || parseFloat(others[i].timestamp) < parseFloat(rearguard.timestamp)) {
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
    if((parseFloat(issuer.timestamp) - parseFloat(rearguard.timestamp)) < fuzzyRange) {
      log.info("ResumeRule triggered for", issuer);
      result = true;
    }
  } else {
    log.silly("ResumeRule triggered as there are no other users synced", issuer);
    result = true;
  }

  return result;
};

module.exports = ResumeRule;
