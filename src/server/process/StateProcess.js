var StateRedis  = require('./redis/StateRedis');
var NeDatabase  = require('../database/NeDatabase');
var LogManager  = require('../log/LogManager');

var logManager = new LogManager();
logManager.initialize();

function StateProcess() {
  logManager.addFileLogging();

  var database = new NeDatabase();
  database.initialize();

  this.stateRedis = new StateRedis();
}

module.exports = StateProcess;
