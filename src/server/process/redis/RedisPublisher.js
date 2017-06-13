const Promise     = require('bluebird');
const Crypto      = require('crypto');
const Events      = require('events');
const Util        = require('util');
const Redis       = require('redis');

const RedisSocket = require('./RedisSocket');
const Config      = require('../../utils/Config');
const LogManager  = require('../../log/LogManager');

Promise.promisifyAll(Redis.RedisClient.prototype);

const TIMEOUT   = 2000;
var log         = LogManager.getLog(LogManager.LogEnum.UTILS);

var config, publisher, subscriber, redisSocket, requestMap, asyncEmitter;

function lazyInit() {
  config        = new Config();
  requestMap    = new Map();
  redisSocket   = new RedisSocket();
  asyncEmitter  = new Events();

  publisher     = Redis.createClient(config.getConfig().redis);
  subscriber    = Redis.createClient(config.getConfig().redis);
}

class RedisPublisher { }

RedisPublisher.prototype.initialize = Promise.coroutine(function* () {
  requestMap = new Map();
  yield cleanUp();
  lazyInit();
  initialize(publisher, subscriber);
  
  RedisPublisher.prototype.enum = RedisPublisher.Enum;
  RedisPublisher.prototype.respEnum = RedisPublisher.RespEnum;
});

RedisPublisher.prototype.publish = function(channel, args, callback) {
  var key = createKey(channel);
  args.push(key);

  var response = function(err, data) {
    if(err !== null) {
      requestMap.delete(key);
    }
  };

  if(callback !== null && callback !== undefined) {
    requestMap.set(key, callback);
  }

  publisher.publish(channel, JSON.stringify(args), response);
};

RedisPublisher.prototype.publishAsync = function(channel, args) {
  var key = createKey(channel);
  args.push(key);

  requestMap.set(key, "promise");

  var promise = new Promise(function(resolve, reject) {
    asyncEmitter.once(key, resolve);
    setTimeout(function(err) {
      asyncEmitter.removeListener(key, resolve);
      reject(err);
    },TIMEOUT, `Request for Key: ${key}, timed out.`);
  }).then(function(data) {
    console.log(data);
    return data[0];
  });

  publisher.publish(channel, JSON.stringify(args));

  return promise;
};

RedisPublisher.Enum = { DATABASE: 'database', STATE: 'state', PLAYER: 'player', SESSION: 'session'};
RedisPublisher.RespEnum = { RESPONSE: 'stateRedisResponse', COMMAND: 'stateRedisCommand'};

module.exports = RedisPublisher;

var initialize = Promise.coroutine(function* (publisher, subscriber) {
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
    if(channel === RedisPublisher.RespEnum.RESPONSE) {
      var key = message;
      if(key !== null && key !== undefined) {
        var callback = requestMap.get(key);
        requestMap.delete(key);

        if(callback === "promise") {
          let data = yield getRedisData(key);
          asyncEmitter.emit(key, JSON.parse(data)[0]);
        } else if(callback !== null && callback !== undefined) {
          let data = yield getRedisData(key);
          data = JSON.parse(data);
          //log.silly(Util.inspect(data, { showHidden: false, depth: null }));
          callback.apply(callback, data);
        }
      }
    } else if(channel === RedisPublisher.RespEnum.COMMAND) {
      var commands = message !== null && message !== undefined ? JSON.parse(message) : [];

      if(commands !== null && commands !== undefined) {
        for(var i in commands) {
          log.silly(Util.inspect(commands[i], { showHidden: false, depth: null}));
          redisSocket.ping.apply(null, commands[i]);
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

  yield subscriber.subscribeAsync("stateRedisResponse");
  yield subscriber.subscribeAsync("stateRedisCommand");
});

var createKey = function(seed) {
  return `${seed}-${Crypto.randomBytes(24).toString('hex')}`;
};

var getRedisData = Promise.coroutine(function* (key, callback) {
  return publisher.getAsync(key)
  .then(Promise.coroutine(function* (data) {
    yield publisher.delAsync(key).catch(log.error);
    return data;
  }));
});

var cleanUp = Promise.coroutine(function* () {
  log.debug("RedisPublisher._cleanUp");
  if(typeof subscriber !== 'undefined' && subscriber) {
    console.log('sub unscribe');
    yield subscriber.unsubscribeAsync("stateRedisResponse");
    yield subscriber.unsubscribeAsync("stateRedisCommand");

    console.log('sub unref');
    subscriber.unref();

    console.log('sub unlisten');
    subscriber.removeAllListeners("message");
    subscriber.removeAllListeners("subscribe");
    subscriber.removeAllListeners("connect");
    subscriber.removeAllListeners("reconnecting");
    subscriber.removeAllListeners("error");
  }

  if(typeof publisher !== 'undefined' && publisher) {
    console.log('pub unlisten');
    publisher.removeAllListenersAsync("connect");
    publisher.removeAllListenersAsync("reconnecting");
    publisher.removeAllListenersAsync("error");

    console.log('pub unref');
    publisher.unref();
  }
});
