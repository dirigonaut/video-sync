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
  initialize.call(this, subscriber);

  subscriber.subscribe("database");
  subscriber.subscribe("state");
  subscriber.subscribe("player");
  subscriber.subscribe("session");
});

module.exports = StateRedis;

function initialize(subscriber) {
  subscriber.on("message", function(channel, message) {
    if(channel === "database") {
      adapter.callFunction(database, message);
    } else if(channel === "state") {
      adapter.callFunction(stateEngine, message);
    } else if(channel === "player") {
      adapter.callFunction(playerManager, message);
    } else if(channel === "session"){
      adapter.callFunction(session, message);
    }
  }.bind(this));

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
