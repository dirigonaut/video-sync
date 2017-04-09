var Redis   = require("redis");
var Session = require('./administration/Session');
var Discover = require('./redis/Discover');

var session = new Session();
var discover = new Discover();

function ServerRedis() {
  this.subcriber = Redis.createClient();
  initialize(this.subcriber);

  this.subcriber.subcribe("session");
}

module.exports = ServerRedis;

function initialize(subcriber) {
  subcriber.on("session", function(channel, message, callback) {
    discover(session, message, callback);
  });
}
