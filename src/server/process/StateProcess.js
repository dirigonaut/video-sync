var StateRedis  = require('./redis/StateRedis');
var NeDatabase  = require('../database/NeDatabase');
var LogManager  = require('../log/LogManager');
var Config      = require('../utils/Config');

var logManager = new LogManager();

function StateProcess() {
  var database = new NeDatabase();
  database.initialize(new Config());

  this.stateRedis = new StateRedis();
}

module.exports = StateProcess;
