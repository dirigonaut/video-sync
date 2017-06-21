const Promise   = require('bluebird');

class StateProcess { }

StateProcess.prototype.initialize = Promise.coroutine(function* () {
  var database = yield this.factory.createNeDatabase();
  database.initialize(this.config);

  this.stateRedis = yield this.factory.createStateRedis();
  this.stateRedis.initialize();
});

module.exports = StateProcess;
