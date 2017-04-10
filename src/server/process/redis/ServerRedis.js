var Util      = require('util');
var Redis     = require("redis");
var Session   = require('../../administration/Session');
var Discover  = require('./Discover');

var session   = new Session();
var discover  = new Discover();

function ServerRedis() {
  this.subscriber = Redis.createClient();
  initialize(this.subscriber);

  this.subscriber.subscribe("session");
}

module.exports = ServerRedis;

function initialize(subscriber) {
  subscriber.on("message", function(channel, message) {
    console.log(channel);
    discover.discover(session, message);
  });

  subscriber.on("subscribe", function(channel, count) {
    console.log(`Subscribed to ${channel}`);
  });

  subscriber.on("connect", function(err) {
    console.log("ServerRedis is connected to redis server");
  });

  subscriber.on("reconnecting", function(err) {
    console.log("ServerRedis is connected to redis server");
  });

  subscriber.on("error", function(err) {
    console.log(err);
  });
}
