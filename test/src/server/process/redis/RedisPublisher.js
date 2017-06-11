const Promise = require('bluebird');
const Redis   = require('redis');
const should  = require('should');

Promise.promisifyAll(Redis.RedisClient.prototype);

const RedisPublisher = require('../../../../../src/server/process/redis/RedisPublisher');
const StateRedisMock = require('../../../../mocks/StateRedisMock');

describe('RedisPublisher', function() {
  describe('#publishAsync()', function() {
    it('should send a command to a redis channel', Promise.coroutine(function* () {
      var publisher = new RedisPublisher();
      yield publisher.initialize();

      var mockData = { "message" : "Ahhhhhhh!"};

      console.log('setup mock');
      var mock = new StateRedisMock();
      yield mock.setMockEvent(RedisPublisher.Enum.DATABASE, mockData);

      var respData = yield publisher.publishAsync(RedisPublisher.Enum.DATABASE, ['Boo']);

      console.log(respData);
      should.deepEqual(mockData, respData, "The publisher response does not match the mockData.");
    }));
  });
});
