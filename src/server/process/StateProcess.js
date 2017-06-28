const Promise   = require('bluebird');

function StateProcess() { }

StateProcess.prototype.initialize = Promise.coroutine(function* () {
  var database = this.factory.createNeDatabase();
  database.initialize();

  this.stateRedis = this.factory.createStateRedis();
  this.stateRedis.initialize();
});

module.exports = StateProcess;
