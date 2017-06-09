const Promise = require('bluebird');
const Redis   = require('redis');
const should  = require('should');

Promise.promisifyAll(Redis.RedisClient.prototype);

const Config          = require('../../../../src/server/utils/Config');
const Authenticator   = require('../../../../src/server/authentication/Authenticator');
const Session         = require('../../../../src/server/administration/Session');
const Publisher       = require('../../../../src/server/process/redis/RedisPublisher');
const StateRedisMock  = require('../../../mocks/StateRedisMock');

describe('Authenticator', function() {
  describe('#requestToken()', function() {
    it('should generate a token for a invited user', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();

      var sessionMock = {"title":"Testing Session","smtp":"","invitees":["test1@gmail.com", "test2@gmail.com"],
      "mailOptions":{"from":"","to":"test@gmail.com","subject":"Testing Email",
      "text":"Woot Woot\nTest Link: "},"_id":"lLN7WmCuvZU79zSS"};

      var inviteeMock = [{ "id": "dummyId1", "email": "test1@gmail.com", "pass": "null" },
      { "id": "null", "email": "test2@gmail.com", "pass": "null" }];

      var mockId = "dummyId1";
      var mockData = { "address" : "test1@gmail.com" };

      var mock = new StateRedisMock();
      yield mock.setMockEvent(Publisher.Enum.DATABASE, sessionMock);

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var session = new Session();
      yield session.setSession('lLN7WmCuvZU79zSS');

      var authenticator = new Authenticator();
      var validate = Promise.coroutine(function* (entry) {
        entry.id.should.equal(mockId);
        entry.address.should.equal(mockData.address);
        entry.pass.should.not.equal("null");
      });

      authenticator.requestToken(mockId, mockData, validate);
    }));
  });

  describe('#validateToken()', function() {
    it('should authenticate an invited user\'s token', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();

      var sessionMock = {"title":"Testing Session","smtp":"","invitees":["test1@gmail.com", "test2@gmail.com"],
      "mailOptions":{"from":"","to":"test@gmail.com","subject":"Testing Email",
      "text":"Woot Woot\nTest Link: "},"_id":"lLN7WmCuvZU79zSS"};

      var inviteeMock = [{ "id": "dummyId1", "email": "test1@gmail.com", "pass": "dummyPass" },
      { "id": "dummyId2", "email": "test2@gmail.com", "pass": "dummyPass" }];

      var mockId = "dummyId1";
      var mockData = { "address" : "test1@gmail.com", "pass" : "dummyPass"};

      var mock = new StateRedisMock();
      yield mock.setMockEvent(Publisher.Enum.DATABASE, sessionMock);

      var session = new Session();
      yield session.setSession('lLN7WmCuvZU79zSS');
      yield session.setInvitees(inviteeMock);

      var authenticator = new Authenticator();
      var validate = function(authorized) {
        should(authorized).be.ok();
      };

      authenticator.validateToken(mockId, mockData, validate);
    }));
  });
});
