var Redis             = require("redis");
var ReflectiveAdapter = require('./ReflectiveAdapter');
var NeDatabase        = require('../../database/NeDatabase');
var StateEngine       = require('../../state/StateEngine.js');
var PlayerManager     = require('../../player/PlayerManager');
var Session           = require('../../administration/Session');

var adapter       = new ReflectiveAdapter();
var database      = new NeDatabase();
var stateEngine   = new StateEngine();
var playerManager = new PlayerManager();
var session       = new Session();

function StateRedis() {
  this.subscriber = Redis.createClient();
  initialize(this.subscriber);

  this.subscriber.subscribe("database");
  this.subscriber.subscribe("state");
  this.subscriber.subscribe("player");
  this.subscriber.subscribe("session");
}

module.exports = StateRedis;

function initialize(subscriber) {
  subscriber.on("message", function(channel, message) {
    if(channel === "database") {
      adapter.callFunction(database, message);
    } else if(channel === "state") {
      adapter.callFunction(stateEngine, message);
    } else if(channel === "player") {
      adapter.callFunction(playerManager, message);
    } else if(channel === "session"){
      adapter.callFunction(session, message);
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
