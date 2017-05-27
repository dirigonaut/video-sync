var Util              = require('util');
var Redis             = require('redis');

var Session           = require('../../administration/Session');
var ReflectiveAdapter = require('./ReflectiveAdapter');

var session, adapter;

function lazyInit() {
  session = new Session();
  adapter = new ReflectiveAdapter();
}

class ServerRedis {
  constructor() {
    if(typeof ServerRedis.prototype.lazyInit === 'undefined') {
      lazyInit();
      ServerRedis.prototype.lazyInit = true;
    }

    this.subscriber = Redis.createClient();
    initialize(this.subscriber);

    this.subscriber.subscribe("session");
  }
}

module.exports = ServerRedis;

function initialize(subscriber) {
  subscriber.on("message", function(channel, message) {
    if(channel === "session"){
      adapter.callFunction(session, message);
    }
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
