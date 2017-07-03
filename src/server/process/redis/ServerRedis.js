const Promise = require('bluebird');
const Util    = require('util');
const Redis   = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

var adapter, subscriber, log;

function ServerRedis() { }

ServerRedis.prototype.initialize = Promise.coroutine(function* () {
  if(typeof ServerRedis.prototype.protoInit === 'undefined') {
    ServerRedis.prototype.protoInit = true;

    var config = this.factory.createConfig();
    adapter    = this.factory.createReflectiveAdapter();
    subscriber = Redis.createClient(config.getConfig().redis);

    attachEvents.call(this);

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.GENERAL);
  }
});

ServerRedis.prototype.cleanUp = Promise.coroutine(function* () {
  log.debug("ServerRedis.cleanUp");
  if(typeof subscriber !== 'undefined' && subscriber) {
    log.info('sub unscribe');
    yield subscriber.unsubscribeAsync("session");

    log.info('sub unref');
    subscriber.unref();

    log.info('sub unlisten');
    subscriber.removeAllListeners("message");
    subscriber.removeAllListeners("subscribe");
    subscriber.removeAllListeners("connect");
    subscriber.removeAllListeners("reconnecting");
    subscriber.removeAllListeners("error");
  }
});

module.exports = ServerRedis;

function attachEvents() {
  subscriber.on("message", Promise.coroutine(function* (channel, message) {
    if(channel === "session"){
      yield adapter.callFunction(session, message);
    }
  }.bind(this)));

  subscriber.on("subscribe", function(channel, count) {
    log.info(`Subscribed to ${channel}`);
  }.bind(this));

  subscriber.on("connect", function(err) {
    log.info("ServerRedis is connected to redis server");
  }.bind(this));

  subscriber.on("reconnecting", function(err) {
    log.info("ServerRedis is connected to redis server");
  }.bind(this));

  subscriber.on("error", function(err) {
    log.info(err);
  }.bind(this));

  subscriber.subscribe("session");
}
