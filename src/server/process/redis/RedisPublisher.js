const Promise     = require('bluebird');
const Crypto      = require('crypto');
const Events      = require('events');
const Util        = require('util');
const Redis       = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

const TIMEOUT   = 6000;

var publisher, subscriber, redisSocket, requestMap, asyncEmitter, log;

function RedisPublisher() { }

RedisPublisher.prototype.initialize = function() {
  if(typeof RedisPublisher.prototype.protoInit === 'undefined') {
    RedisPublisher.prototype.protoInit = true;
    var config      = this.factory.createConfig();

    requestMap    = new Map();
    asyncEmitter  = new Events();
    redisSocket   = this.factory.createRedisSocket();
    subscriber    = Redis.createClient(config.getConfig().redis);
    publisher     = Redis.createClient(config.getConfig().redis);

    attachEvents.call(this);

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.GENERAL);
  }
};

RedisPublisher.prototype.publishAsync = Promise.coroutine(function* (channel, args) {
  var key = createKey(channel);
  args.push(key);
  requestMap.set(key, process.pid);

  var promise = new Promise(function(resolve, reject) {
    asyncEmitter.once(key, function(data) {
      requestMap.delete(key);
      resolve(data);
    });
    setTimeout(function(err) {
      requestMap.delete(key);
      asyncEmitter.removeListener(key, resolve);
      reject(err);
    },TIMEOUT, `Request for Key: ${key}, timed out.`);
  });

  yield publisher.publishAsync(channel, JSON.stringify(args));

  return promise;
});

RedisPublisher.prototype.publish = function(channel, args) {
  return publisher.publishAsync(channel, JSON.stringify(args));
};

RedisPublisher.Enum = {};
RedisPublisher.Enum.Key = { STATE: 'state', PLAYER: 'player' };
RedisPublisher.Enum.Resp  = { RESPONSE: 'stateRedisResponse', COMMAND: 'stateRedisCommand'};

module.exports = RedisPublisher;

var attachEvents = function() {
  publisher.on("connect", function(err) {
    log.debug("RedisPublisher is connected to redis server");
  });

  publisher.on("reconnecting", function(err) {
    log.debug("RedisPublisher is connected to redis server");
  });

  publisher.on("error", function(err) {
    log.error(err);
  });

  subscriber.on("message", Promise.coroutine(function* (channel, message) {
    if(channel === RedisPublisher.Enum.Resp.RESPONSE) {
      if(message) {
        if(requestMap.get(message)) {
          let data = yield getRedisData.call(this, message);

          if(data) {
            data = JSON.parse(data);
            log.silly(Util.inspect(data, { showHidden: false, depth: 1}));
          }

          asyncEmitter.emit(message, data);
        }
      }
    } else if(channel === RedisPublisher.Enum.Resp.COMMAND) {
      message = JSON.parse(message);
      if(message) {
        log.silly(Util.inspect(message, { showHidden: false, depth: 1}));
        if(Array.isArray(message)) {
          yield redisSocket.ping.apply(null, message);
        }
      }
    }
  }));

  subscriber.on("subscribe", function(channel, count) {
    log.info(`RedisSubscriber subscribed to ${channel}`);
  });

  subscriber.on("connect", function(err) {
    log.debug("RedisSubscriber is connected to redis server");
  });

  subscriber.on("reconnecting", function(err) {
    log.debug("RedisSubscriber is connected to redis server");
  });

  subscriber.on("error", function(err) {
    log.error(err);
  });

  subscriber.subscribe("stateRedisResponse");
  subscriber.subscribe("stateRedisCommand");
};

var createKey = function(seed) {
  return `${seed}-${Crypto.randomBytes(24).toString('hex')}`;
};

var getRedisData = function(key) {
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
