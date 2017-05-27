var Events      = require('events');

var StateRedis  = require('./redis/StateRedis');
var NeDatabase  = require('../database/NeDatabase');
var Config      = require('../utils/Config');

class StateProcess extends Events {
  constructor() {
    super();
  }
}

StateProcess.prototype.initialize = function() {
  var database = new NeDatabase();
  database.initialize(new Config());

  this.stateRedis = new StateRedis();

  this.emit('started');
};

module.exports = StateProcess;
