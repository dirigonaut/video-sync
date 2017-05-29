const StateRedis  = require('./redis/StateRedis');
const NeDatabase  = require('../database/NeDatabase');
const Config      = require('../utils/Config');

class StateProcess { }

StateProcess.prototype.initialize = function() {
  var database = new NeDatabase();
  database.initialize(new Config());

  this.stateRedis = new StateRedis();
};

module.exports = StateProcess;
