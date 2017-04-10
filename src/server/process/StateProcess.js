var StateRedis  = require('./redis/StateRedis');
var NeDatabase  = require('../database/NeDatabase');
var LogManager  = require('../log/LogManager');

var logManager = new LogManager();
logManager.initialize();

function StateProcess(appData) {
  logManager.addFileLogging(appData);

  var database = new NeDatabase();
  database.initialize(appData);

  this.stateRedis = new StateRedis();
}

module.exports = StateProcess;
