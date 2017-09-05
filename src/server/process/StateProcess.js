const Promise   = require('bluebird');

var database, stateSubscriber, log;

function StateProcess() { }

StateProcess.prototype.initialize = function(force) {
  if(typeof StateProcess.prototype.protoInit === 'undefined') {
    StateProcess.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.GENERAL);
  }
};

StateProcess.prototype.start = function() {
  log.debug('StateProcess.start()')
  database = this.factory.createNeDatabase();
  database.initialize();

  stateSubscriber = this.factory.createStateSubscriber();
  stateSubscriber.initialize();
};

module.exports = StateProcess;
