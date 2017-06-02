const Promise     = require('bluebird');
const Crypto      = require('crypto');
const Events      = require('events');
const Util        = require('util');
const Redis       = require('redis');

const RedisSocket = require('./RedisSocket');
const Config      = require('../../utils/Config');
const LogManager  = require('../../log/LogManager');

const TIMEOUT   = 10000;
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

class RedisPublisher {
  constructor() {
    if(typeof RedisPublisher.prototype.lazyInit === 'undefined') {
      lazyInit();
      RedisPublisher.prototype.lazyInit = true;
    }
  }
}

RedisPublisher.prototype.initialize = function() {
  requestMap = new Map();
  initialize(publisher, subscriber);
};

RedisPublisher.prototype.publish = function(channel, args, callback) {
  var key = createKey(channel);
  args.push(key);

  var response = function(err, data) {
    if(err !== null) {
      requestMap.remove(key, callback);
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

  var promise = new Promise(function(resolve, reject) {
    asyncEmitter.on(key, resolve);
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

var initialize = function(publisher, subscriber) {
  publisher.on("connect", function(err) {
    log.debug("RedisPublisher is connected to redis server");
  });

  publisher.on("reconnecting", function(err) {
    log.debug("RedisPublisher is connected to redis server");
  });

  publisher.on("error", function(err) {
    log.error(err);
  });

  subscriber.on("message", function(channel, message) {
    if(channel === RedisPublisher.RespEnum.RESPONSE) {
      var key = message;

      if(key !== null && key !== undefined) {
        var callback = requestMap.get(key);

        if(callback !== null && callback !== undefined) {
          var onData = function(data) {
            var data = JSON.parse(data);
            log.silly(Util.inspect(data, { showHidden: false, depth: null }));
            callback.apply(callback, data);
          }
          getRedisData(key, onData);
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
  });

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

var getRedisData = function(key, callback) {
  publisher.get(key, function(err, reply) {
    if(err === null) {
      publisher.del(key);
      callback(reply);
    }
  });
};
