const Promise = require('bluebird');
const Redis   = require('redis');

var adapter, database, playerManager, subscriber, stateEngine, log;

function StateRedis() { };

StateRedis.prototype.initialize = function(force) {
  if(typeof StateRedis.prototype.protoInit === 'undefined') {
    StateRedis.prototype.protoInit = true;
    var config      = this.factory.createConfig();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.GENERAL);
  }

  if(force === undefined ? typeof StateRedis.prototype.stateInit === 'undefined' : force) {
    StateRedis.prototype.stateInit = true;
    playerManager   = this.factory.createPlayerManager();
    adapter         = this.factory.createReflectiveAdapter();
    subscriber      = Redis.createClient(config.getConfig().redis);
    stateEngine     = this.factory.createStateEngine();
    database        = this.factory.createNeDatabase();

    stateEngine.initialize();
    attachEvents();
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
  }));

  subscriber.on("subscribe", function(channel, count) {
    log.info(`Subscribed to ${channel}`);
  });

  subscriber.on("connect", function(err) {
    log.info("StateRedis is connected to redis server");
  });

  subscriber.on("reconnecting", function(err) {
    log.info("StateRedis is connected to redis server");
  });

  subscriber.on("error", function(err) {
    log.error(err);
  });

  subscriber.subscribe("database");
  subscriber.subscribe("state");
  subscriber.subscribe("player");
  subscriber.subscribe("session");
}
