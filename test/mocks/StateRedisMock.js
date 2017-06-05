const Promise = require('bluebird');
const Redis = require('redis');

const Publisher   = require('../../src/server/process/redis/RedisPublisher');
const Config      = require('../../src/server/utils/Config');
const LogManager  = require('../../src/server/log/LogManager');

var log         = LogManager.getLog(LogManager.LogEnum.UTILS);

Promise.promisifyAll(Redis.RedisClient.prototype);

var config;

class StateRedisMock {
  constructor() {
    config          = new Config();
    this.publisher  = Redis.createClient(config.getConfig().redis);
    this.subscriber = Redis.createClient(config.getConfig().redis);
  }
}

StateRedisMock.prototype.setMockEvent = function(key, payload) {
  var handle = Promise.coroutine(function* (channel, message) {
    if(channel === key) {
      var id = JSON.parse(message).pop();
      console.log(`Mock: Id: ${id}, ${JSON.stringify(payload)}`);
      yield this.publisher.setAsync(id, JSON.stringify(payload));
      yield this.publisher.publishAsync(Publisher.RespEnum.RESPONSE, id);
      yield this.subscriber.removeListenerAsync("message", handle);
    }
  }).bind(this);

  this.subscriber.on("message", handle);

  this.subscriber.on("subscribe", function(channel, count) {
    log.info(`StateRedisMock subscribed to ${channel}`);
  });

  this.subscriber.on("connect", function(err) {
    log.debug("StateRedisMock is connected to redis server");
  });

  return this.subscriber.subscribeAsync(key);
};

module.exports = StateRedisMock;
