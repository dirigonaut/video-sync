const Promise     = require('bluebird');
const Crypto      = require('crypto');
const Events      = require('events');
const Util        = require('util');
const Redis       = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

const TIMEOUT   = 2000;

var publisher, subscriber, redisSocket, requestMap, asyncEmitter;

function RedisPublisher() { }

RedisPublisher.prototype.initialize = Promise.coroutine(function* () {
  requestMap = new Map();
  yield cleanUp.call(this);

  requestMap    = new Map();
  redisSocket   = yield this.factory.createRedisSocket();
  asyncEmitter  = new Events();

  publisher     = Redis.createClient(this.config.getConfig().redis);
  subscriber    = Redis.createClient(this.config.getConfig().redis);

  initialize.call(this, publisher, subscriber);

  RedisPublisher.prototype.enum = RedisPublisher.Enum;
  RedisPublisher.prototype.respEnum = RedisPublisher.RespEnum;
});

RedisPublisher.prototype.publish = function(channel, args, callback) {
  var key = createKey(channel);
  args.push(key);

  var response = function(err, data) {
    if(err) {
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
  });

  publisher.publish(channel, JSON.stringify(args));

  return promise;
};

RedisPublisher.Enum = { DATABASE: 'database', STATE: 'state', PLAYER: 'player', SESSION: 'session'};
RedisPublisher.RespEnum = { RESPONSE: 'stateRedisResponse', COMMAND: 'stateRedisCommand'};

module.exports = RedisPublisher;

var initialize = Promise.coroutine(function* (publisher, subscriber) {
  publisher.on("connect", function(err) {
    this.log.debug("RedisPublisher is connected to redis server");
  }.bind(this));

  publisher.on("reconnecting", function(err) {
    this.log.debug("RedisPublisher is connected to redis server");
  }.bind(this));

  publisher.on("error", function(err) {
    this.log.error(err);
  }.bind(this));

  subscriber.on("message", Promise.coroutine(function* (channel, message) {
    if(channel === RedisPublisher.RespEnum.RESPONSE) {
      var key = message;
      if(key !== null && key !== undefined) {
        var callback = requestMap.get(key);

        if(callback === "promise") {
          requestMap.delete(key);
          let data = yield getRedisData.call(this, key);

          if(data) {
            data = JSON.parse(data)[0];
            //console.log(Util.inspect(data, { showHidden: false, depth: null }));
          }

          asyncEmitter.emit(key, data);
        } else if(typeof callback === "function") {
          requestMap.delete(key);
          let data = yield getRedisData.call(this, key);
          data = JSON.parse(data);
          //console.log(Util.inspect(data, { showHidden: false, depth: null }));
          callback.apply(callback, [data]);
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
  }.bind(this)));

  subscriber.on("subscribe", function(channel, count) {
    this.log.info(`RedisSubscriber subscribed to ${channel}`);
  }.bind(this));

  subscriber.on("connect", function(err) {
    this.log.debug("RedisSubscriber is connected to redis server");
  }.bind(this));

  subscriber.on("reconnecting", function(err) {
    this.log.debug("RedisSubscriber is connected to redis server");
  }.bind(this));

  subscriber.on("error", function(err) {
    this.log.error(err);
  }.bind(this));

  yield subscriber.subscribeAsync("stateRedisResponse");
  yield subscriber.subscribeAsync("stateRedisCommand");
});

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
  this.log.debug("RedisPublisher._cleanUp");
  if(typeof subscriber !== 'undefined' && subscriber) {
    yield subscriber.unsubscribeAsync("stateRedisResponse");
    yield subscriber.unsubscribeAsync("stateRedisCommand");

    subscriber.unref();

    subscriber.removeAllListeners("message");
    subscriber.removeAllListeners("subscribe");
    subscriber.removeAllListeners("connect");
    subscriber.removeAllListeners("reconnecting");
    subscriber.removeAllListeners("error");
  }

  if(typeof publisher !== 'undefined' && publisher) {
    publisher.removeAllListenersAsync("connect");
    publisher.removeAllListenersAsync("reconnecting");
    publisher.removeAllListenersAsync("error");

    publisher.unref();
  }
});
