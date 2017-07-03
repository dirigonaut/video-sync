const Promise   = require('bluebird');

var database, stateRedis, log;

function StateProcess() { }

StateProcess.prototype.initialize = function() {
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

  stateRedis = this.factory.createStateRedis();
  stateRedis.initialize();
};

module.exports = StateProcess;
