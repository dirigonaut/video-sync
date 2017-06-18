const Promise = require('bluebird');
const Redis   = require('redis');
const should  = require('should');

Promise.promisifyAll(Redis.RedisClient.prototype);

const Config            = require('../../../../../src/server/utils/Config');
const MockFactory       = require('../../../../mocks/MockFactory');
const RedisMock         = require('../../../../mocks/RedisMock');
const StateRedis        = require('../../../../../src/server/process/redis/StateRedis');

describe('StateRedis', function() {
  describe('#onEvent Message', function() {
    it('should receive an event that triggers a call to ReflectiveAdapter', Promise.coroutine(function* () {
      var mockFactory = Object.create(MockFactory.prototype);
      yield mockFactory.initialize();

      var mockData = "TestData";

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var mockMixin = mockFactory.createMockMixin([mockFactory.ImportEnum.REFLECTIVEADAPTER, mockFactory.ImportEnum.LOGMANAGER]);
      mockMixin.reflectiveAdapter.pushReturn(mockMixin.reflectiveAdapter.Enum.CALLFUNCTION,
        Promise.coroutine(function* () {
          yield client.setAsync("key", mockData);
        }));

      mockMixin.config = config;

      mockMixin.logManager.LogEnum = { GENERAL: "" };
      mockMixin.logManager.pushReturn(mockMixin.logManager.GETLOG,
        function () {
          return { info: function() {}, error: function() {}, debug: function() {} };
        });

      var ObjectFactory = mockFactory.getImport(mockFactory.ImportEnum.OBJECTFACTORY);
      mockMixin.factory = mockFactory.createMockObject(mockFactory.ImportEnum.OBJECTFACTORY, ObjectFactory.prototype);

      mockMixin.factory.pushReturn(mockMixin.factory.Enum.CREATESTATEENGINE,
        Promise.coroutine(function* () {
          return { initialize: function() {} };
        }));

      var stateRedis = Object.create(StateRedis.prototype);
      Object.assign(stateRedis, mockMixin);
      stateRedis.initialize();

      var publisher = Redis.createClient(config.getConfig().redis);
      yield publisher.publishAsync("session", "key");

      var respData = yield client.getAsync("key");
      should.deepEqual(mockData, respData, "The StateRedis did not cause a key to be injected into redis.");
    }));
  });
});
