const Promise = require('bluebird');
const Redis   = require('redis');
const should  = require('should');

Promise.promisifyAll(Redis.RedisClient.prototype);

const Config          = require('../../../../src/server/utils/Config');
const Session         = require('../../../../src/server/administration/Session');
const Publisher       = require('../../../../src/server/process/redis/RedisPublisher');
const RedisMock       = require('../../../mocks/RedisMock');

describe('Session', function() {
  describe('#setSession()', function() {
    it('should set the session', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();

      var sessionMock = {"title":"Testing Session","smtp":"","invitees":["test@gmail.com"],
      "mailOptions":{"from":"","to":"test@gmail.com","subject":"Testing Email",
      "text":"Woot Woot\nTest Link: "},"_id":"lLN7WmCuvZU79zSS"};

      var inviteeMock = [{ "id": null, "email": "test@gmail.com", "pass": null }];

      var mock = new RedisMock();
      yield mock.setMockEvent(Publisher.Enum.DATABASE, [[sessionMock]]);

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var session = new Session();
      yield session.setSession('lLN7WmCuvZU79zSS');

      var sessionData = yield client.getAsync(Session.Enum.ACTIVE);
      should.deepEqual(sessionMock, JSON.parse(sessionData), "Sessions did not match");

      var inviteeData = yield client.getAsync(Session.Enum.USERS);
      should.deepEqual(inviteeMock, JSON.parse(inviteeData), "Invitee list did not match");
    }));
  });

  describe('#getSession()', function() {
    it('should return the session', Promise.coroutine(function* () {
      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var sessionMock = {"title":"Testing Session","smtp":"","invitees":["test@gmail.com"],
      "mailOptions":{"from":"","to":"test@gmail.com","subject":"Testing Email",
      "text":"Woot Woot\nTest Link: "},"_id":"lLN7WmCuvZU79zSS"};

      yield client.setAsync(Session.Enum.ACTIVE, JSON.stringify(sessionMock));

      var session = new Session();

      var sessionData = yield session.getSession();

      should.deepEqual(sessionMock, sessionData, "Sessions did not match");
    }));
  });

  describe('#getInvitees()', function() {
    it('should return the list of invitees', Promise.coroutine(function* () {
      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var sessionMock = {"title":"Testing Session","smtp":"","invitees":["test@gmail.com"],
      "mailOptions":{"from":"","to":"test@gmail.com","subject":"Testing Email",
      "text":"Woot Woot\nTest Link: "},"_id":"lLN7WmCuvZU79zSS"};

      yield client.setAsync(Session.Enum.USERS, JSON.stringify(sessionMock));

      var session = new Session();

      var inviteeData = yield session.getInvitees()
      .then(function(data) {
        return data;
      });

      should.deepEqual(sessionMock, inviteeData, "Invitee list did not match");
    }));
  });

  describe('#setInvitees()', function() {
    it('should set the list of invitees', Promise.coroutine(function* () {
      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var inviteeMock = [{ "id": null, "email": "test@gmail.com", "pass": null }];

      var session = new Session();
      yield session.setInvitees(inviteeMock);

      var inviteeData = yield client.getAsync(Session.Enum.USERS);
      should.deepEqual(inviteeMock, JSON.parse(inviteeData), "Invitee list did not match");
    }));
  });

  describe('#addInvitee()', function() {
    it('should add invitee to the session', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();

      var sessionMock = {"title":"Testing Session","smtp":"","invitees":["test@gmail.com"],
      "mailOptions":{"from":"","to":"test@gmail.com","subject":"Testing Email",
      "text":"Woot Woot\nTest Link: "},"_id":"lLN7WmCuvZU79zSS"};

      var inviteeMock = { id: null, email: "test2@gmail.com", pass: null };

      var mock = new RedisMock();
      yield mock.setMockEvent(Publisher.Enum.DATABASE, [[sessionMock]]);

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var session = new Session();
      yield session.setSession('lLN7WmCuvZU79zSS');
      yield session.addInvitee(inviteeMock.email);

      var inviteeData = yield client.getAsync(Session.Enum.USERS);
      JSON.parse(inviteeData).should.containEql(inviteeMock, "Invitee list did not match");
    }));
  });

  describe('#removeInvitee()', function() {
    it('should remove an invitee from the session', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();

      var sessionMock = {"title":"Testing Session","smtp":"","invitees":["test@gmail.com"],
      "mailOptions":{"from":"","to":"test@gmail.com","subject":"Testing Email",
      "text":"Woot Woot\nTest Link: "},"_id":"lLN7WmCuvZU79zSS"};

      var inviteeMock = { id: null, email: "test@gmail.com", pass: null };

      var mock = new RedisMock();
      yield mock.setMockEvent(Publisher.Enum.DATABASE, [[sessionMock]]);

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var session = new Session();
      yield session.setSession('lLN7WmCuvZU79zSS');
      yield session.removeInvitee(inviteeMock.email);

      var inviteeData = yield client.getAsync(Session.Enum.USERS);
      JSON.parse(inviteeData).should.not.containEql(inviteeMock, "Invitee list did not match");
    }));
  });

  describe('#setMediaStarted()', function() {
    it('should set the media started flag', Promise.coroutine(function* () {
      var pathMock = "/test/tester/testest/";

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var session = new Session();
      yield session.setMediaPath(pathMock);
      yield session.setMediaStarted(true);

      var startedData = yield client.getAsync(Session.Enum.STARTED);
      should((startedData == "true")).be.ok();
    }));
  });

  describe('#setMediaPath()', function() {
    it('should set the media path in the session', Promise.coroutine(function* () {
      var pathMock = "/test/tester/testest/";

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var session = new Session();
      yield session.setMediaPath(pathMock);

      var pathData = yield client.getAsync(Session.Enum.MEDIA);
      var startedData = yield client.getAsync(Session.Enum.STARTED);

      should(JSON.stringify(pathMock) == pathData).be.ok();
      should((startedData == "false")).be.ok();
    }));
  });

  describe('#isAdmin()', function() {
    it('should return if the user is admin or not', Promise.coroutine(function* () {
      var mockId = "test234";

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var session = new Session();
      yield session.addAdmin(mockId);

      should(session.isAdmin(mockId)).be.ok();
    }));
  });

  describe('#addAdmin()', function() {
    it('should add a user to the admin list', Promise.coroutine(function* () {
      var mockId = "test234";

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var session = new Session();
      yield session.addAdmin(mockId);

      var adminIds = yield client.getAsync(Session.Enum.ADMIN);
      JSON.parse(adminIds).should.containEql(mockId, "Admin list did not match");
    }));
  });

  describe('#removeAdmin()', function() {
    it('should remove a admin from the admin list', Promise.coroutine(function* () {
      var mockId = "test234";

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      yield client.setAsync(Session.Enum.ADMIN, JSON.stringify([ mockId ]));

      var session = new Session();
      yield session.removeAdmin(mockId);

      var adminIds = yield client.getAsync(Session.Enum.ADMIN);
      JSON.parse(adminIds).should.not.containEql(mockId, "Admin list did not match");
    }));
  });
});
