var Events      = require('events');

var StateRedis  = require('./redis/StateRedis');
var NeDatabase  = require('../database/NeDatabase');
var LogManager  = require('../log/LogManager');
var Config      = require('../utils/Config');

var logManager = new LogManager();

class StateProcess extends Events {
  constructor() {
    super();
  }

  initialize() {
    var database = new NeDatabase();
    database.initialize(new Config());

    this.stateRedis = new StateRedis();

    this.emit('started');
  }
}

module.exports = StateProcess;
