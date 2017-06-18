const Promise = require('bluebird');
const Redis   = require('redis');
const should  = require('should');

Promise.promisifyAll(Redis.RedisClient.prototype);

const Config            = require('../../../../../src/server/utils/Config');
const MockFactory       = require('../../../../mocks/MockFactory');
const RedisMock         = require('../../../../mocks/RedisMock');
const ServerRedis        = require('../../../../../src/server/process/redis/ServerRedis');

describe('ServerRedis', function() {
  describe('#onEvent Message', function() {
    it('should receive an event that triggers a call to ReflectiveAdapter', Promise.coroutine(function* () {
      var mockFactory = Object.create(MockFactory.prototype);
      yield mockFactory.initialize();

      var mockKey = "key";

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);
      var serverRedis = Object.create(ServerRedis.prototype);

      var mockMixin = mockFactory.createMockMixin([mockFactory.ImportEnum.REFLECTIVEADAPTER, mockFactory.ImportEnum.LOGMANAGER, mockFactory.ImportEnum.SESSION]);
      mockMixin.reflectiveAdapter.pushReturn(mockMixin.reflectiveAdapter.Enum.CALLFUNCTION,
        Promise.coroutine(function* (data, message) {
          should.deepEqual(message, mockKey, "The ServerRedis did not cause a call to the ReflectiveAdapter.");
          serverRedis.cleanUp();
        }));

      mockMixin.config = config;
      mockMixin.logManager = mockFactory.mockLogging(mockMixin.logManager);

      var ObjectFactory = mockFactory.getImport(mockFactory.ImportEnum.OBJECTFACTORY);
      mockMixin.factory = mockFactory.createMockObject(mockFactory.ImportEnum.OBJECTFACTORY, ObjectFactory.prototype);

      mockMixin.factory.pushReturn(mockMixin.factory.Enum.CREATEREFLECTIVEADAPTER,
        Promise.coroutine(function* () {
          return mockMixin.reflectiveAdapter;
        }));


      Object.assign(serverRedis, mockMixin);
      yield serverRedis.initialize();

      var publisher = Redis.createClient(config.getConfig().redis);
      yield publisher.publishAsync("session", "key");
    }));
  });
});
