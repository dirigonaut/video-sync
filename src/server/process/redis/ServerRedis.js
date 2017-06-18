const Util              = require('util');
const Redis             = require('redis');

const Config            = require('../../utils/Config');
const Session           = require('../../administration/Session');
const ReflectiveAdapter = require('./ReflectiveAdapter');

Promise.promisifyAll(Redis.RedisClient.prototype);

var config, session, adapter, subscriber;

function lazyInit() {
  config              = new Config();
  session             = new Session();
  adapter             = new ReflectiveAdapter();

  subscriber          = Redis.createClient(config.getConfig().redis);
}

class ServerRedis {
  constructor() {
    if(typeof ServerRedis.prototype.lazyInit === 'undefined') {
      lazyInit();
      ServerRedis.prototype.lazyInit = true;
    }

    initialize(subscriber);
    subscriber.subscribe("session");
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
