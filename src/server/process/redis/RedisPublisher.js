const crypto    = require('crypto');
var Util        = require('util');
var Redis       = require("redis");
var RedisSocket = require('./RedisSocket');

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

module.exports = RedisPublisher;

var initialize = function(publisher, subscriber) {
  publisher.on("connect", function(err) {
    console.log("RedisPublisher is connected to redis server");
  });

  publisher.on("reconnecting", function(err) {
    console.log("RedisPublisher is connected to redis server");
  });

  publisher.on("error", function(err) {
    console.log(err);
  });

  subscriber.on("message", function(channel, message) {
    if(channel === "stateRedisResponse") {
      var key = message;

      if(key !== null && key !== undefined) {
        var callback = requestMap.get(key);

        if(callback !== null && callback !== undefined) {
          var onData = function(data) {
            var data = JSON.parse(data);
            //console.log(Util.inspect(data, { showHidden: false, depth: null }));
            callback.apply(callback, data);
          }
          getRedisData(key, onData);
        }
      }
    } else if(channel === "stateRedisCommand") {
      var commands = message !== null && message !== undefined ? JSON.parse(message) : [];

      if(commands !== null && commands !== undefined) {
        for(var i in commands) {
          redisSocket.broadcastToId.apply(null, commands[i]);
        }
      }
    }
  });

  subscriber.on("subscribe", function(channel, count) {
    console.log(`RedisSubscriber subscribed to ${channel}`);
  });

  subscriber.on("connect", function(err) {
    console.log("RedisSubscriber is connected to redis server");
  });

  subscriber.on("reconnecting", function(err) {
    console.log("RedisSubscriber is connected to redis server");
  });

  subscriber.on("error", function(err) {
    console.log(err);
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
