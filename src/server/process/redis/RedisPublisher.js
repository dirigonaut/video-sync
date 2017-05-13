const crypto    = require('crypto');
var Util        = require('util');
var Redis       = require("redis");
var RedisSocket = require('./RedisSocket');
var LogManager  = require('../../log/LogManager');

var log         = LogManager.getLog(LogManager.LogEnum.UTILS);

var publisher   = Redis.createClient();
var subscriber  = Redis.createClient();

var requestMap  = new Map();
var redisSocket = new RedisSocket();

function RedisPublisher() {
}

RedisPublisher.prototype.initialize = function() {
  requestMap = new Map();
  initialize(publisher, subscriber);
};

RedisPublisher.prototype.publish = function(channel, args, callback) {
  var key = createKey(channel);
  args.push(key);

  var response = function(err, data) {
    if(err === null && callback !== null && callback !== undefined) {
      requestMap.set(key, callback);
    }
  };

  publisher.publish(channel, JSON.stringify(args), response);
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
          log.silly(Util.inspect(commands[i], { showHidden: false, depth: null }));
          redisSocket.broadcastToId.apply(null, commands[i]);
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
  return `${seed}-${crypto.randomBytes(24).toString('hex')}`;
};

var getRedisData = function(key, callback) {
  publisher.get(key, function(err, reply) {
    if(err === null) {
      publisher.del(key);
      callback(reply);
    }
  });
};
