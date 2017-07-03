const Promise = require('bluebird');
const Redis   = require('redis');

var adapter, database, playerManager, subscriber, stateEngine, log;

function StateRedis() { };

StateRedis.prototype.initialize = function() {
  if(typeof StateRedis.prototype.protoInit === 'undefined') {
    StateRedis.prototype.protoInit = true;

    adapter       = this.factory.createReflectiveAdapter();
    database      = this.factory.createNeDatabase();
    stateEngine   = this.factory.createStateEngine();
    playerManager = this.factory.createPlayerManager();

    var config    = this.factory.createConfig();
    subscriber    = Redis.createClient(config.getConfig().redis);

    stateEngine.initialize();
    attachEvents.call(this);

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.GENERAL);
  }
};

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

function attachEvents() {
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


  subscriber.subscribe("database");
  subscriber.subscribe("state");
  subscriber.subscribe("player");
  subscriber.subscribe("session");
}
