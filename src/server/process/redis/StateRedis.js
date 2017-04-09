var Redis         = require("redis");

var Discover      = require('./redis/Discover');
var NeDatabase    = require('../../database/NeDatabase');
var StateEngine   = require('../../state/StateEngine.js');
var PlayerManager = require('../../player/PlayerManager');

var discover      = new Discover();
var database      = new NeDatabase();
var stateEngine   = new StateEngine();
var playerManager = new PlayerManager();

function StateRedis() {
  this.subcriber = Redis.createClient();
  initialize(this.subcriber);

  this.subcriber.subcribe("database");
  this.subcriber.subcribe("state");
  this.subcriber.subcribe("player");
}

module.exports = StateRedis;

function initialize(subcriber) {
  subcriber.on("database", function(channel, message, callback) {
    discover(database, message, callback);
  });

  subcriber.on("state", function(channel, message, callback) {
    discover(stateEngine, message, callback);
  });

  subcriber.on("player", function(channel, message, callback) {
    discover(playerManager, message, callback);
  });
}
