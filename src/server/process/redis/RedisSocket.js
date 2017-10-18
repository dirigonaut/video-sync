const Promise     = require('bluebird');
const Redis       = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

var publisher, subscriber, io, schemaFactory, log;

function RedisSocket() { }

RedisSocket.prototype.initialize = function() {
  if(typeof RedisSocket.prototype.protoInit === 'undefined') {
    RedisSocket.prototype.protoInit = true;
    var config    = this.factory.createConfig();
    publisher     = Redis.createClient(config.getConfig().redis);
    subscriber    = Redis.createClient(config.getConfig().redis);

    attachEvents.call(this);

    schemaFactory   = this.factory.createSchemaFactory();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.GENERAL);
  }
};

RedisSocket.prototype.setIO = function(socketIO) {
  io = socketIO;
};

RedisSocket.prototype.broadcast = Promise.coroutine(function* (key, message) {
  log.debug(`RedisSocket.broadcast ${key}`);
  yield publisher.publishAsync(RedisSocket.Enum.Key.BROADCAST, JSON.stringify([key, message]));
});

RedisSocket.prototype.ping = Promise.coroutine(function* (id, key, message) {
  log.debug(`RedisSocket.ping ${key}`);
  yield publisher.publishAsync(RedisSocket.Enum.Key.PING, JSON.stringify([id, key, message]));
});

RedisSocket.prototype.disconnect = Promise.coroutine(function* (id) {
  log.debug(`RedisSocket.disconnect ${id}`);
  yield publisher.publishAsync(RedisSocket.Enum.Key.DISCONNECT, id);
});

RedisSocket.Enum = {};
RedisSocket.Enum.Key = { BROADCAST: 'redisSocketBroadcast', PING: 'redisSocketPing', DISCONNECT: 'redisDisconnect' };

module.exports = RedisSocket;

var attachEvents = function() {
  subscriber.on("message", function(channel, payload) {
    if(channel === RedisSocket.Enum.Key.BROADCAST) {
      payload = JSON.parse(payload);

      if(io && payload) {
        var result;
        if(Array.isArray(payload[1])) {
          result = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.RESPONSE, [payload[1]]);
        } else {
          result = payload[1];
        }

        io.emit(payload[0], result);
      }
    } else if(channel === RedisSocket.Enum.Key.PING) {
      payload = JSON.parse(payload);

      if(io && payload) {
        var result;
        if(Array.isArray(payload[2])) {
          result = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.RESPONSE, [payload[2]]);
        } else {
          result = payload[2];
        }

        io.sockets.to(payload[0]).emit(payload[1], result);
      }
    } else if(channel === RedisSocket.Enum.Key.DISCONNECT) {
      if(io && payload) {
        try{
          var socket = io.sockets.connected[payload];
          if(socket) {
            socket.disconnect();
          }
        } catch(err) {
          log.error(err);
        }
      }
    }
  }.bind(this));

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

  subscriber.subscribe(RedisSocket.Enum.Key.BROADCAST);
  subscriber.subscribe(RedisSocket.Enum.Key.PING);
  subscriber.subscribe(RedisSocket.Enum.Key.DISCONNECT);
};
