const Promise = require('bluebird');
const Redis   = require('redis');
const should  = require('should');

Promise.promisifyAll(Redis.RedisClient.prototype);

const Config            = require('../../../../../src/server/utils/Config');
const MockFactory       = require('../../../../mocks/MockFactory');
const ReflectiveAdapter = require('../../../../../src/server/process/redis/ReflectiveAdapter');

describe('ReflectiveAdapter', function() {
  describe('#callFunction()', function() {
    it('from a redis event it should call a function on an object', Promise.coroutine(function* () {
      var mockFactory = Object.create(MockFactory.prototype);
      yield mockFactory.initialize();

      var mockData = "boo!";

      var mockMixin = mockFactory.createMockMixin([mockFactory.ImportEnum.PLAYERMANAGER]);
      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYER, mockData);

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var adapter = Object.create(ReflectiveAdapter.prototype);
      adapter.initialize();

      yield adapter.callFunction(mockMixin.playerManager, JSON.stringify([mockMixin.playerManager.Enum.GETPLAYER, "key"]));
      var respData = yield client.getAsync("key");

      should.deepEqual(respData, JSON.stringify(mockData), "The ReflectiveAdapter response does not match the mockData.");
    }));
  });

  describe('#callFunction()', function() {
    it('from a redis event it should call a function* on an object', Promise.coroutine(function* () {
      var mockFactory = Object.create(MockFactory.prototype);
      yield mockFactory.initialize();

      var mockData = "boo!";

      var mockMixin = mockFactory.createMockMixin([mockFactory.ImportEnum.SESSION]);
      mockMixin.session.pushReturn(mockMixin.session.Enum.GETSESSION, mockData);

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var adapter = Object.create(ReflectiveAdapter.prototype);
      adapter.initialize();

      yield adapter.callFunction(mockMixin.session, JSON.stringify([mockMixin.session.Enum.GETSESSION, "key"]));
      var respData = yield client.getAsync("key");

      should.deepEqual(respData, JSON.stringify(mockData), "The ReflectiveAdapter response does not match the mockData.");
    }));
  });
});
