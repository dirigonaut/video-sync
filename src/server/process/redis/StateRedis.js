const Promise           = require('bluebird');
const Redis             = require('redis');

const ReflectiveAdapter = require('./ReflectiveAdapter');
const NeDatabase        = require('../../database/NeDatabase');
const PlayerManager     = require('../../player/PlayerManager');

var adapter, database, playerManager, subscriber, stateEngine;

var lazyInit = Promise.coroutine(function* () {
  adapter       = new ReflectiveAdapter();
  database      = new NeDatabase();
  stateEngine   = yield this.factory.createStateEngine();
  playerManager = new PlayerManager();

  subscriber    = Redis.createClient(this.config.getConfig().redis);

  stateEngine.initialize();
});

function StateRedis() { };

StateRedis.prototype.initialize = Promise.coroutine(function* () {
  if(typeof StateRedis.prototype.lazyInit === 'undefined') {
    yield lazyInit.call(this);
    StateRedis.prototype.lazyInit = true;
  }

  this.log = this.logManager.getLog(this.logManager.LogEnum.GENERAL);
  console.log(this.log);
  initialize.call(this, subscriber);

  yield subscriber.subscribeAsync("database");
  yield subscriber.subscribeAsync("state");
  yield subscriber.subscribeAsync("player");
  yield subscriber.subscribeAsync("session");
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
    this.log.info(`Subscribed to ${channel}`);
  }.bind(this));

  subscriber.on("connect", function(err) {
    this.log.info("StateRedis is connected to redis server");
  }.bind(this));

  subscriber.on("reconnecting", function(err) {
    this.log.info("StateRedis is connected to redis server");
  }.bind(this));

  subscriber.on("error", function(err) {
    this.log.error(err);
  }.bind(this));
}
