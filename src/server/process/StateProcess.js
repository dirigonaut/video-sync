var StateRedis  = require('./redis/StateRedis');
var NeDatabase  = require('../database/NeDatabase');

function StateProcess(appData) {
  var database = new NeDatabase();
  database.initialize(appData);

  this.stateRedis = new StateRedis();
}

modules.export = StateProcess;
