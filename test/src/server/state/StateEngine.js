const Promise = require('bluebird');
const Redis   = require('redis');
const should  = require('should');

Promise.promisifyAll(Redis.RedisClient.prototype);

const Config          = require('../../../../src/server/utils/Config');
const Publisher       = require('../../../../src/server/process/redis/RedisPublisher');
const StateEngine     = require('../../../../src/server/state/StateEngine');

const MockFactory     = require('../../../mocks/MockFactory');

describe('StateEngine', function() {
  describe('#init()', function() {
    it('should init the player session side and send a command to the client to proceed with init', Promise.coroutine(function* () {
      var mockFactory = Object.create(MockFactory.prototype);
      yield mockFactory.initialize();

      var stateEngine = Object.create(StateEngine.prototype);

      var mockMixin = mockFactory.createMockMixin([mockFactory.ImportEnum.LOGMANAGER, mockFactory.ImportEnum.SESSION, mockFactory.ImportEnum.PLAYERMANAGER]);
      mockMixin.session.pushReturn(mockMixin.session.Enum.GETMEDIAPATH,
        Promise.coroutine(function* () {
          return "mediaPath";
        }));

      mockMixin.logManager = mockFactory.mockLogging(mockMixin.logManager);

      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYER,
        function() {
          var Player = mockFactory.getImport(mockFactory.ImportEnum.PLAYER);
          var player =  mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);
          player.id = "test";
          return player;
        });

      Object.assign(stateEngine, mockMixin);
      stateEngine.initialize();

      var result = yield stateEngine.initPlayer("test");
      should.deepEqual(result, [["test"], "state-init"], "The StateEngine did not return the init event.");
    }));
  });

  describe('#play()', function() {
    it('should determine if a play should be issued and issue if necesssary', Promise.coroutine(function* () {
      var mockFactory = Object.create(MockFactory.prototype);
      yield mockFactory.initialize();

      var stateEngine = Object.create(StateEngine.prototype);

      var Player = mockFactory.getImport(mockFactory.ImportEnum.PLAYER);
      var player =  mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);

      var mockMixin = mockFactory.createMockMixin([mockFactory.ImportEnum.LOGMANAGER, mockFactory.ImportEnum.SESSION,
        mockFactory.ImportEnum.PLAYERMANAGER, mockFactory.ImportEnum.PLAYRULE]);
      mockMixin.session.pushReturn(mockMixin.session.Enum.GETMEDIAPATH,
        Promise.coroutine(function* () {
          return "mediaPath";
        }));
      mockMixin.session.pushReturn(mockMixin.session.Enum.SETMEDIASTARTED,
        Promise.coroutine(function* () { }));
      mockMixin.session.pushReturn(mockMixin.session.Enum.GETMEDIASTARTED,
        Promise.coroutine(function* () { return true; }));

      mockMixin.logManager = mockFactory.mockLogging(mockMixin.logManager);

      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYER,
        function() {
          player.id = "test";
          return player;
        });

      mockMixin.playRule.pushReturn(mockMixin.playRule.Enum.EVALUATE,
        function() {
          return [player];
        });

      var ObjectFactory = mockFactory.getImport(mockFactory.ImportEnum.OBJECTFACTORY);
      mockMixin.factory = mockFactory.createMockObject(mockFactory.ImportEnum.OBJECTFACTORY, ObjectFactory.prototype);

      mockMixin.factory.pushReturn(mockMixin.factory.Enum.CREATEPLAYRULE,
        Promise.coroutine(function* () {
          return mockMixin.playRule;
        }));

      Object.assign(stateEngine, mockMixin);
      stateEngine.initialize();

      var result = yield stateEngine.play("test");
      should.deepEqual(result, [[["test", "state-play"]]], "The StateEngine did not return the init event.");
    }));
  });

  describe('#pause()', function() {
    it('should pause all the players', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();


    }));
  });

  describe('#seek()', function() {
    it('should send a message to players to seek to the requested timestamp', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();


    }));
  });

  describe('#pauseSync()', function() {
    it('should authenticate an invited user\'s token', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();


    }));
  });

  describe('#changeSyncState()', function() {
    it('should authenticate an invited user\'s token', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();


    }));
  });

  describe('#timeUpdate()', function() {
    it('should authenticate an invited user\'s token', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();


    }));
  });

  describe('#syncingPing()', function() {
    it('should authenticate an invited user\'s token', Promise.coroutine(function* () {
      var publisher = new Publisher();
      yield publisher.initialize();


    }));
  });
});
