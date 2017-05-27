var Redis             = require('redis');

var ReflectiveAdapter = require('./ReflectiveAdapter');
var NeDatabase        = require('../../database/NeDatabase');
var StateEngine       = require('../../state/StateEngine.js');
var PlayerManager     = require('../../player/PlayerManager');
var Session           = require('../../administration/Session');
var Config            = require('../../utils/Config');

var config, adapter, database, stateEngine, playerManager, session, subscriber;

function lazyInit() {
  config        = new Config();
  adapter       = new ReflectiveAdapter();
  database      = new NeDatabase();
  stateEngine   = new StateEngine();
  playerManager = new PlayerManager();
  session       = new Session();

  subscriber    = Redis.createClient(config.getConfig().redis);
}

class StateRedis {
  constructor() {
    if(typeof StateRedis.prototype.lazyInit === 'undefined') {
      lazyInit();
      StateRedis.prototype.lazyInit = true;
    }

    initialize(subscriber);

    subscriber.subscribe("database");
    subscriber.subscribe("state");
    subscriber.subscribe("player");
    subscriber.subscribe("session");
  }
}

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
  });

  subscriber.on("subscribe", function(channel, count) {
    console.log(`Subscribed to ${channel}`);
  });

  subscriber.on("connect", function(err) {
    console.log("StateRedis is connected to redis server");
  });

  subscriber.on("reconnecting", function(err) {
    console.log("StateRedis is connected to redis server");
  });

  subscriber.on("error", function(err) {
    console.log(err);
  });
}
