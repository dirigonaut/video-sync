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
  subscriber.on("session", function(channel, message, callback) {
    discover.discover(session, message, callback);
  });
}
