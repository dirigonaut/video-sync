const Promise     = require('bluebird');
const Crypto      = require('crypto');
const Events      = require('events');
const Util        = require('util');
const Redis       = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

const TIMEOUT   = 2000;

var publisher, subscriber, redisSocket, requestMap, asyncEmitter, log;

function RedisPublisher() { }

RedisPublisher.prototype.initialize = function() {
  if(typeof RedisPublisher.prototype.protoInit === 'undefined') {
    RedisPublisher.prototype.protoInit = true;

    requestMap = new Map();

    requestMap    = new Map();
    redisSocket   = this.factory.createRedisSocket();
    asyncEmitter  = new Events();

    var config    = this.factory.createConfig();
    publisher     = Redis.createClient(config.getConfig().redis);
    subscriber    = Redis.createClient(config.getConfig().redis);

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.GENERAL);

    attachEvents.call(this);
  }
};

RedisPublisher.prototype.publishAsync = Promise.coroutine(function* (channel, args) {
  var key = createKey(channel);
  args.push(key);

  requestMap.set(key, process.pid);

  var promise = new Promise(function(resolve, reject) {
    asyncEmitter.once(key, resolve);
    setTimeout(function(err) {
      requestMap.delete(key);
      asyncEmitter.removeListener(key, resolve);
      reject(err);
    },TIMEOUT, `Request for Key: ${key}, timed out.`);
  });

  yield publisher.publishAsync(channel, JSON.stringify(args));

  return promise;
});

RedisPublisher.Enum = { DATABASE: 'database', STATE: 'state', PLAYER: 'player', SESSION: 'session'};
RedisPublisher.RespEnum = { RESPONSE: 'stateRedisResponse', COMMAND: 'stateRedisCommand'};

RedisPublisher.prototype.Enum = RedisPublisher.Enum;
RedisPublisher.prototype.RespEnum = RedisPublisher.RespEnum;

module.exports = RedisPublisher;

var attachEvents = function() {
  publisher.on("connect", function(err) {
    log.debug("RedisPublisher is connected to redis server");
  }.bind(this));

  publisher.on("reconnecting", function(err) {
    log.debug("RedisPublisher is connected to redis server");
  }.bind(this));

  publisher.on("error", function(err) {
    log.error(err);
  }.bind(this));

  subscriber.on("message", Promise.coroutine(function* (channel, message) {
    if(channel === RedisPublisher.RespEnum.RESPONSE) {
      if(message) {
        if(requestMap.get(message)) {
          requestMap.delete(message);
          let data = yield getRedisData.call(this, message);

          if(data) {
            data = JSON.parse(data);
            log.silly(Util.inspect(data, { showHidden: false, depth: null }));
          }

          asyncEmitter.emit(message, data);
        }
      }
    } else if(channel === RedisPublisher.RespEnum.COMMAND) {
      var commands = message !== null && message !== undefined ? JSON.parse(message) : [];

      if(commands) {
        for(var i in commands) {
          log.silly(Util.inspect(commands[i], { showHidden: false, depth: null}));
          yield redisSocket.ping.apply(null, commands[i]);
        }
      }
    }
  }.bind(this)));

  subscriber.on("subscribe", function(channel, count) {
    log.info(`RedisSubscriber subscribed to ${channel}`);
  }.bind(this));

  subscriber.on("connect", function(err) {
    log.debug("RedisSubscriber is connected to redis server");
  }.bind(this));

  subscriber.on("reconnecting", function(err) {
    log.debug("RedisSubscriber is connected to redis server");
  }.bind(this));

  subscriber.on("error", function(err) {
    log.error(err);
  }.bind(this));

  subscriber.subscribe("stateRedisResponse");
  subscriber.subscribe("stateRedisCommand");
};

var createKey = function(seed) {
  return `${seed}-${Crypto.randomBytes(24).toString('hex')}`;
};

var getRedisData = function(key, callback) {
  return publisher.getAsync(key)
  .then(Promise.coroutine(function* (data) {
    yield publisher.delAsync(key).catch(log.error);
    return data;
  }));
};

var cleanUp = Promise.coroutine(function* () {
  log.debug("RedisPublisher._cleanUp");
  if(subscriber) {
    yield subscriber.unsubscribeAsync("stateRedisResponse");
    yield subscriber.unsubscribeAsync("stateRedisCommand");

    subscriber.unref();

    subscriber.removeAllListeners("message");
    subscriber.removeAllListeners("subscribe");
    subscriber.removeAllListeners("connect");
    subscriber.removeAllListeners("reconnecting");
    subscriber.removeAllListeners("error");
  }

  if(publisher) {
    publisher.removeAllListenersAsync("connect");
    publisher.removeAllListenersAsync("reconnecting");
    publisher.removeAllListenersAsync("error");

    publisher.unref();
  }
});
