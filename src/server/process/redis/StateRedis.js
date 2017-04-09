var Redis         = require("redis");

var Discover      = require('./Discover');
var NeDatabase    = require('../../database/NeDatabase');
var StateEngine   = require('../../state/StateEngine.js');
var PlayerManager = require('../../player/PlayerManager');

var discover      = new Discover();
var database      = new NeDatabase();
var stateEngine   = new StateEngine();
var playerManager = new PlayerManager();

function StateRedis() {
  this.subscriber = Redis.createClient();
  initialize(this.subscriber);

  this.subscriber.subscribe("database");
  this.subscriber.subscribe("state");
  this.subscriber.subscribe("player");
}

module.exports = StateRedis;

function initialize(subscriber) {
  subscriber.on("database", function(channel, message, callback) {
    console.log(channel);
    discover.discover(database, message, callback);
  });

  subscriber.on("state", function(channel, message, callback) {
    console.log(channel);
    discover.discover(stateEngine, message, callback);
  });

  subscriber.on("player", function(channel, message, callback) {
    console.log(channel);
    discover.discover(playerManager, message, callback);
  });
}
