const Promise           = require('bluebird');
const Redis             = require('redis');

const ReflectiveAdapter = require('./ReflectiveAdapter');
const NeDatabase        = require('../../database/NeDatabase');
const PlayerManager     = require('../../player/PlayerManager');

var adapter, database, playerManager, subscriber, stateEngine;

var lazyInit = Promise.coroutine(function* () {
  adapter       = this.factory.createReflectiveAdapter();
  database      = this.factory.createNeDatabase();
  stateEngine   = this.factory.createStateEngine();
  playerManager = this.factory.createPlayerManager();

  subscriber    = Redis.createClient(config.getConfig().redis);

  console.log("StateEngine inited")
  stateEngine.initialize();
  adapter.initialize();
});

function StateRedis() { };

StateRedis.prototype.initialize = Promise.coroutine(function* () {
  if(typeof StateRedis.prototype.lazyInit === 'undefined') {
    yield lazyInit.call(this);
    StateRedis.prototype.lazyInit = true;
  }

  this.log = this.logManager.getLog(this.logManager.LogEnum.GENERAL);
  initialize.call(this, subscriber);

  yield subscriber.subscribeAsync("database");
  yield subscriber.subscribeAsync("state");
  yield subscriber.subscribeAsync("player");
  yield subscriber.subscribeAsync("session");
});

StateRedis.prototype.cleanUp = Promise.coroutine(function* () {
  log.debug("ServerRedis.cleanUp");
  if(typeof subscriber !== 'undefined' && subscriber) {
    log.info('sub unscribe');
    yield subscriber.unsubscribeAsync("database");
    yield subscriber.unsubscribeAsync("state");
    yield subscriber.unsubscribeAsync("player");
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

module.exports = StateRedis;

function initialize(subscriber) {
  subscriber.on("message", Promise.coroutine(function* (channel, message) {
    if(channel === "database") {
      yield adapter.callFunction(database, message);
    } else if(channel === "state") {
      yield adapter.callFunction(stateEngine, message);
    } else if(channel === "player") {
      yield adapter.callFunction(playerManager, message);
    } else if(channel === "session"){
      yield adapter.callFunction(session, message);
    }
  }.bind(this)));

  subscriber.on("subscribe", function(channel, count) {
    log.info(`Subscribed to ${channel}`);
  }.bind(this));

  subscriber.on("connect", function(err) {
    log.info("StateRedis is connected to redis server");
  }.bind(this));

  subscriber.on("reconnecting", function(err) {
    log.info("StateRedis is connected to redis server");
  }.bind(this));

  subscriber.on("error", function(err) {
    log.error(err);
  }.bind(this));
}
