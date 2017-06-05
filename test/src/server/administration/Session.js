const Promise = require('bluebird');
const Redis   = require('redis');
const should  = require('should');

Promise.promisifyAll(Redis.RedisClient.prototype);

const Config  = require('../../../../src/server/utils/Config');
const Session = require('../../../../src/server/administration/Session');
const Publisher = require('../../../../src/server/process/redis/RedisPublisher');
const StateRedisMock = require('../../../mocks/StateRedisMock');

describe('Session', function() {
  describe('#setSession()', function() {
    it('should set the session', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();

      var mockData = {"title":"Testing Session","smtp":"","invitees":["danielcsabo@gmail.com","test@gmail.com"],
                      "mailOptions":{"from":"","to":"danielcsabo@gmail.com,test@gmail.com","subject":"Testing Email","text":"Woot Woot\nTest Link: "}};

      var mock = new StateRedisMock();
      yield mock.setMockEvent(Publisher.Enum.DATABASE, mockData);

      var config = new Config();
      var client = Redis.createClient(config.getConfig().redis);

      var session = new Session();
      yield session.setSession('dummyId');

      var sessionData = yield client.getAsync(Session.Enum.ACTIVE)
      .then(function(data) {
        return data;
      });

      should.deepEqual(mockData, JSON.parse(sessionData), "Sessions did not match");
    }));
  });

  describe('#getSession()', function() {
    it('should return the session', function() {

    });
  });

  describe('#getInvitees()', function() {
    it('should return the list of invitees', function() {

    });
  });

  describe('#setInvitees()', function() {
    it('should set the list of invitees', function() {

    });
  });

  describe('#addInvitee()', function() {
    it('should add invitee to the session', function() {

    });
  });

  describe('#removeInvitee()', function() {
    it('should remove an invitee from the session', function() {

    });
  });

  describe('#setMediaStarted()', function() {
    it('should set the media started flag', function() {

    });
  });

  describe('#getMediaStarted()', function() {
    it('should return the media started flag', function() {

    });
  });

  describe('#getMediaPath()', function() {
    it('should return the media path', function() {

    });
  });

  describe('#setMediaPath()', function() {
    it('should set the media path in the session', function() {

    });
  });

  describe('#isAdmin()', function() {
    it('should return if the user is admin or not', function() {

    });
  });

  describe('#getAdmin()', function() {
    it('should return list of admins', function() {

    });
  });

  describe('#addAdmin()', function() {
    it('should add a user to the admin list', function() {

    });
  });

  describe('#removeAdmin()', function() {
    it('should remove a admin from the admin list', function() {

    });
  });
});
