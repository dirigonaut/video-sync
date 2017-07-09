const Promise     = require('bluebird');
const Redis       = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

var publisher, subscriber, io, schemaFactory, log;

function RedisSocket() { }

RedisSocket.prototype.initialize = function(force) {
  if(typeof RedisSocket.prototype.protoInit === 'undefined') {
    RedisSocket.prototype.protoInit = true;
    schemaFactory   = this.factory.createSchemaFactory();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.GENERAL);
  }

  if(force === undefined ? typeof RedisSocket.prototype.stateInit === 'undefined' : force) {
    RedisSocket.prototype.stateInit = true;
    var config    = this.factory.createConfig();
    publisher     = Redis.createClient(config.getConfig().redis);
    subscriber    = Redis.createClient(config.getConfig().redis);

    attachEvents.call(this);
  }
};

RedisSocket.prototype.setIO = function(socketIO) {
  io = socketIO;
};

RedisSocket.prototype.broadcast = Promise.coroutine(function* (key, message) {
  log.debug(`RedisSocket.broadcast ${key}`);
  yield publisher.publishAsync(RedisSocket.MessageEnum.BROADCAST, JSON.stringify([key, message]));
});

RedisSocket.prototype.ping = Promise.coroutine(function* (id, key, message) {
  log.debug(`RedisSocket.ping ${key}`);
  yield publisher.publishAsync(RedisSocket.MessageEnum.PING, JSON.stringify([id, key, message]));
});

RedisSocket.MessageEnum = { BROADCAST: 'redisSocketBroadcast', PING: 'redisSocketPing' };

module.exports = RedisSocket;

var attachEvents = function() {
  subscriber.on("message", function(channel, payload) {
    if(channel === RedisSocket.MessageEnum.BROADCAST) {
      payload = JSON.parse(payload);

      if(io && payload) {
        var result;
        if(Array.isArray(payload[1])) {
          result = schemaFactory.createPopulatedSchema(schemaFactory.Enum.RESPONSE, [payload[1]]);
        } else {
          result = payload[1];
        }

        io.emit(payload[0], result);
      }
    } else if(channel === RedisSocket.MessageEnum.PING) {
      payload = JSON.parse(payload);

      if(io && payload) {
        var result;
        if(Array.isArray(payload[2])) {
          result = schemaFactory.createPopulatedSchema(schemaFactory.Enum.RESPONSE, [payload[2]]);
        } else {
          result = payload[2];
        }

        io.sockets.to(payload[0]).emit(payload[1], result);
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

  subscriber.subscribe(RedisSocket.MessageEnum.BROADCAST);
  subscriber.subscribe(RedisSocket.MessageEnum.PING);
};
