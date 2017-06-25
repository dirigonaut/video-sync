const Promise     = require('bluebird');
const Redis       = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

var publisher, subscriber, io;

function RedisSocket() { }

RedisSocket.prototype.initialize = Promise.coroutine(function* (socketIO) {
  if(typeof RedisSocket.prototype.lazyInit === 'undefined') {
    publisher     = Redis.createClient(this.config.getConfig().redis);
    subscriber    = Redis.createClient(this.config.getConfig().redis);
    RedisSocket.prototype.lazyInit = true;
  }

  io = socketIO;
  yield initialize.call(this, subscriber);
});

RedisSocket.prototype.broadcast = function(key, message) {
  this.log.debug(`RedisSocket.prototype.broadcastToIds`);
  publisher.publish(RedisSocket.MessageEnum.BROADCAST, JSON.stringify([key, message]));
};

RedisSocket.prototype.ping = function(id, key, message) {
  this.log.debug(`RedisSocket.prototype.ping`);
  publisher.publish(RedisSocket.MessageEnum.PING, JSON.stringify([id, key, message]));
};

RedisSocket.MessageEnum = { BROADCAST: 'redisSocketBroadcast', PING: 'redisSocketPing' };

module.exports = RedisSocket;

var initialize = Promise.coroutine(function* (subscriber) {
  subscriber.on("message", function(channel, payload) {
    if(channel === RedisSocket.MessageEnum.BROADCAST) {
      payload = JSON.parse(payload);

      if(io !== null) {
        io.emit(payload[0], payload[1]);
      }
    } else if(channel === RedisSocket.MessageEnum.PING) {
      payload = JSON.parse(payload);

      if(io !== null) {
        io.sockets.to(payload[0]).emit(payload[1], payload[2]);
      }
    }
  }.bind(this));

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

  yield subscriber.subscribeAsync(RedisSocket.MessageEnum.BROADCAST);
  yield subscriber.subscribeAsync(RedisSocket.MessageEnum.PING);
});
