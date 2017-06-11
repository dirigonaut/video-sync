const StateRedis  = require('./redis/StateRedis');
const NeDatabase  = require('../database/NeDatabase');

class StateProcess { }

StateProcess.prototype.initialize = function() {
  var database = new NeDatabase();
  database.initialize(this.config);

  this.stateRedis = new StateRedis();
};

module.exports = StateProcess;
