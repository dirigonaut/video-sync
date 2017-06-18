const Promise           = require('bluebird');
const Util              = require('util');
const Redis             = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

var adapter, subscriber;

var lazyInit = Promise.coroutine(function* () {
  adapter             = yield this.factory.createReflectiveAdapter();
  subscriber          = Redis.createClient(this.config.getConfig().redis);
});

function ServerRedis() { }

ServerRedis.prototype.initialize = Promise.coroutine(function* () {
  if(typeof ServerRedis.prototype.lazyInit === 'undefined') {
    yield lazyInit.call(this);
    ServerRedis.prototype.lazyInit = true;
  }

  this.log = this.logManager.getLog(this.logManager.LogEnum.GENERAL);
  initialize.call(this, subscriber);

  yield subscriber.subscribeAsync("session");
});

ServerRedis.prototype.cleanUp = Promise.coroutine(function* () {
  this.log.debug("ServerRedis.cleanUp");
  if(typeof subscriber !== 'undefined' && subscriber) {
    this.log.info('sub unscribe');
    yield subscriber.unsubscribeAsync("session");

    this.log.info('sub unref');
    subscriber.unref();

    this.log.info('sub unlisten');
    subscriber.removeAllListeners("message");
    subscriber.removeAllListeners("subscribe");
    subscriber.removeAllListeners("connect");
    subscriber.removeAllListeners("reconnecting");
    subscriber.removeAllListeners("error");
  }
});

module.exports = ServerRedis;

function initialize(subscriber) {
  subscriber.on("message", Promise.coroutine(function* (channel, message) {
    if(channel === "session"){
      yield adapter.callFunction(this.session, message);
    }
  }.bind(this)));

  subscriber.on("subscribe", function(channel, count) {
    this.log.info(`Subscribed to ${channel}`);
  }.bind(this));

  subscriber.on("connect", function(err) {
    this.log.info("ServerRedis is connected to redis server");
  }.bind(this));

  subscriber.on("reconnecting", function(err) {
    this.log.info("ServerRedis is connected to redis server");
  }.bind(this));

  subscriber.on("error", function(err) {
    this.log.info(err);
  }.bind(this));
}
