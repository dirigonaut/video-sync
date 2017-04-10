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
  subscriber.on("message", function(channel, message) {
    console.log(channel);

    if(channel === "database") {
      discover.discover(database, message);
    } else if(channel === "state") {
      discover.discover(stateEngine, message);
    } else if(channel === "player") {
      discover.discover(playerManager, message);
    }
  });

  subscriber.on("subscribe", function(channel, count) {
    console.log(`Subscribed to ${channel}`);
  });

  subscriber.on("connect", function(err) {
    console.log("StateRedis is connected to redis server");
  });

  subscriber.on("reconnecting", function(err) {
    console.log("StateRedis is connected to redis server");
  });

  subscriber.on("error", function(err) {
    console.log(err);
  });
}
