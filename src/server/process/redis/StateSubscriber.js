const Promise = require("bluebird");
const Redis   = require("redis");

var adapter, playerManager, subscriber, stateEngine, log;

function StateSubscriber() { };

StateSubscriber.prototype.initialize = function(force) {
  if(typeof StateSubscriber.prototype.protoInit === "undefined") {
    StateSubscriber.prototype.protoInit = true;
    var config      = this.factory.createConfig();

    playerManager   = this.factory.createPlayerManager();
    adapter         = this.factory.createRedisAdapter();
    subscriber      = Redis.createClient(config.getConfig().redisInfo.connection);
    stateEngine     = this.factory.createStateEngine();

    stateEngine.initialize();
    attachEvents();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.GENERAL);
  }
};

StateSubscriber.prototype.cleanUp = Promise.coroutine(function* () {
  log.debug("StateSubscriber.cleanUp");
  if(typeof subscriber !== "undefined" && subscriber) {
    log.info("sub unscribe");
    yield subscriber.unsubscribeAsync("database");
    yield subscriber.unsubscribeAsync("state");
    yield subscriber.unsubscribeAsync("player");
    yield subscriber.unsubscribeAsync("media");

    log.info("sub unref");
    subscriber.unref();

    log.info("sub unlisten");
    subscriber.removeAllListeners("message");
    subscriber.removeAllListeners("subscribe");
    subscriber.removeAllListeners("connect");
    subscriber.removeAllListeners("reconnecting");
    subscriber.removeAllListeners("error");
  }
});

module.exports = StateSubscriber;

function attachEvents() {
  subscriber.on("message", Promise.coroutine(function* (channel, message) {
    if(channel === "state") {
      yield adapter.callFunction(stateEngine, message);
    } else if(channel === "player") {
      yield adapter.callFunction(playerManager, message);
    }
  }));

  subscriber.on("subscribe", function(channel, count) {
    log.info(`Subscribed to ${channel}`);
  });

  subscriber.on("connect", function(err) {
    log.info("StateSubscriber is connected to redis server");
  });

  subscriber.on("reconnecting", function(err) {
    log.info("StateSubscriber is connected to redis server");
  });

  subscriber.on("error", function(err) {
    log.error(err);
  });

  subscriber.subscribe("state");
  subscriber.subscribe("player");
}
