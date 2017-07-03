const Promise = require('bluebird');
const Util    = require('util');
const Redis   = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

var adapter, subscriber, log;

function ServerRedis() { }

ServerRedis.prototype.initialize = Promise.coroutine(function* (force) {
  if(typeof ServerRedis.prototype.protoInit === 'undefined') {
    ServerRedis.prototype.protoInit = true;
    var config      = this.factory.createConfig();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.GENERAL);
  }

  if(force === undefined ? typeof ServerRedis.prototype.stateInit === 'undefined' : force) {
    ServerRedis.prototype.stateInit = true;
    adapter    = this.factory.createReflectiveAdapter();
    subscriber = Redis.createClient(config.getConfig().redis);

    attachEvents();
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
  }));

  subscriber.on("subscribe", function(channel, count) {
    log.info(`Subscribed to ${channel}`);
  });

  subscriber.on("connect", function(err) {
    log.info("ServerRedis is connected to redis server");
  });

  subscriber.on("reconnecting", function(err) {
    log.info("ServerRedis is connected to redis server");
  });

  subscriber.on("error", function(err) {
    log.info(err);
  });

  subscriber.subscribe("session");
}
