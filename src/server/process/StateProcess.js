const Promise   = require('bluebird');

const NeDatabase  = require('../database/NeDatabase');

class StateProcess { }

StateProcess.prototype.initialize = Promise.coroutine(function* () {
  var database = new NeDatabase();
  database.initialize(this.config);

  this.stateRedis = yield this.factory.createStateRedis();
  this.stateRedis.initialize();
});

module.exports = StateProcess;
