const Promise = require('bluebird');
const Redis   = require('redis');
const should  = require('should');

Promise.promisifyAll(Redis.RedisClient.prototype);

const Config          = require('../../../../src/server/utils/Config');
const Authenticator   = require('../../../../src/server/authentication/Authenticator');
const Session         = require('../../../../src/server/administration/Session');
const Publisher       = require('../../../../src/server/process/redis/RedisPublisher');
const StateRedisMock  = require('../../../mocks/StateRedisMock');

describe('StateEngine', function() {
  describe('#init()', function() {
    it('should init the player session side and send a command to the client to proceed with init', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();

      var mockData = { "address" : "test1@gmail.com" };

      var mock = new StateRedisMock();
      yield mock.setMockEvent(Publisher.Enum.DATABASE, sessionMock);

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var session = new Session();
      yield session.setSession('lLN7WmCuvZU79zSS');


    }));
  });

  describe('#play()', function() {
    it('should determine if a play should be issued and issue if necesssary', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();

      var mockData = { "address" : "test1@gmail.com", "pass" : "dummyPass"};

      var mock = new StateRedisMock();
      yield mock.setMockEvent(Publisher.Enum.DATABASE, sessionMock);

      var session = new Session();

    }));
  });

  describe('#pause()', function() {
    it('should pause all the players', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();

      var mockData = { "address" : "test1@gmail.com", "pass" : "dummyPass"};

      var mock = new StateRedisMock();
      yield mock.setMockEvent(Publisher.Enum.DATABASE, sessionMock);

      var session = new Session();

    }));
  });

  describe('#seek()', function() {
    it('should send a message to players to seek to the requested timestamp', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();

      var mockData = { "address" : "test1@gmail.com", "pass" : "dummyPass"};

      var mock = new StateRedisMock();
      yield mock.setMockEvent(Publisher.Enum.DATABASE, sessionMock);

      var session = new Session();

    }));
  });

  describe('#pauseSync()', function() {
    it('should authenticate an invited user\'s token', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();

      var mockData = { "address" : "test1@gmail.com", "pass" : "dummyPass"};

      var mock = new StateRedisMock();
      yield mock.setMockEvent(Publisher.Enum.DATABASE, sessionMock);

      var session = new Session();

    }));
  });

  describe('#changeSyncState()', function() {
    it('should authenticate an invited user\'s token', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();

      var mockData = { "address" : "test1@gmail.com", "pass" : "dummyPass"};

      var mock = new StateRedisMock();
      yield mock.setMockEvent(Publisher.Enum.DATABASE, sessionMock);

      var session = new Session();

    }));
  });

  describe('#timeUpdate()', function() {
    it('should authenticate an invited user\'s token', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();

      var mockData = { "address" : "test1@gmail.com", "pass" : "dummyPass"};

      var mock = new StateRedisMock();
      yield mock.setMockEvent(Publisher.Enum.DATABASE, sessionMock);

      var session = new Session();

    }));
  });

  describe('#syncingPing()', function() {
    it('should authenticate an invited user\'s token', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();

      var mockData = { "address" : "test1@gmail.com", "pass" : "dummyPass"};

      var mock = new StateRedisMock();
      yield mock.setMockEvent(Publisher.Enum.DATABASE, sessionMock);

      var session = new Session();

    }));
  });
});
