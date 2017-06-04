const Promise = require('bluebird');
const Redis = require('redis');

const Publisher = require('../../src/server/process/redis/RedisPublisher');
const Config    = require('../../src/server/utils/Config');

Promise.promisifyAll(Redis.RedisClient.prototype);

var config, subscriber, publisher;

function lazyInit() {
  config        = new Config();
  subscriber    = Redis.createClient(config.getConfig().redis);
  publisher     = Redis.createClient(config.getConfig().redis);
}

class RedisSubscriberMock {
  constructor() {
    if(typeof RedisSubscriberMock.prototype.lazyInit === 'undefined') {
      lazyInit();
      RedisSubscriberMock.prototype.lazyInit = true;
    }
  }
}

RedisSubscriberMock.prototype.setMockEvent = function(key, payload) {
  subscriber.subscribe(key);

  subscriber.on("message", Promise.coroutine(function* (channel, message) {
    if(channel === key) {
      var id = JSON.parse(message).pop();
      yield publisher.setAsync(id, JSON.stringify(payload));

      yield publisher.publishAsync(Publisher.RespEnum.RESPONSE, id);
    }
  }));
};

RedisSubscriberMock.prototype.cleanup = function() {
  subscriber.unref();
  subscriber.removeAllListeners("message");

  publisher.unref();
};

module.exports = RedisSubscriberMock;
