var Redis       = require('redis');

var LogManager    = require('../../log/LogManager');
var log           = LogManager.getLog(LogManager.LogEnum.GENERAL);

var publisher   = Redis.createClient();
var subscriber  = Redis.createClient();

var io = null;

class RedisSocket {
  initialize(socketIO) {
    io = socketIO;
  }

  broadcastToIds(ids, key, message) {
    log.silly(`RedisSocket.prototype.broadcastToIds`);
    publisher.publish(RedisSocket.MessageEnum.BROADCAST, JSON.stringify([key, message]));
  }

  broadcastToId(id, key, message) {
    log.silly(`RedisSocket.prototype.broadcastToId`);
    publisher.publish(RedisSocket.MessageEnum.PING, JSON.stringify([id, key, message]));
  }
}

RedisSocket.MessageEnum = { BROADCAST: 'redisSocketBroadcast', PING: 'redisSocketPing'};

module.exports = RedisSocket;

var initialize = function(publisher, subscriber) {
  subscriber.on("message", function(channel, payload) {
    if(channel === RedisSocket.MessageEnum.BROADCAST) {
      payload = JSON.parse(payload);

      if(io !== null) {
        if(ids !== null && ids !== undefined) {
          io.emit(payload[0], payload[1]);
        }
      }
    } else if(channel === RedisSocket.MessageEnum.PING) {
      payload = JSON.parse(payload);

      if(io !== null) {
        io.sockets.to(payload[0]).emit(payload[1], payload[2]);
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

  subscriber.subscribe(RedisSocket.MessageEnum.BROADCAST);
  subscriber.subscribe(RedisSocket.MessageEnum.PING);
}
