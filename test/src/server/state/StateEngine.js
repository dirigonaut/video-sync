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
      var player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);

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
      var mockFactory = Object.create(MockFactory.prototype);
      yield mockFactory.initialize();

      var stateEngine = Object.create(StateEngine.prototype);

      var Player = mockFactory.getImport(mockFactory.ImportEnum.PLAYER);
      var player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);

      var mockMixin = mockFactory.createMockMixin([mockFactory.ImportEnum.LOGMANAGER, mockFactory.ImportEnum.SESSION,
        mockFactory.ImportEnum.PLAYERMANAGER]);
      mockMixin.session.pushReturn(mockMixin.session.Enum.GETMEDIAPATH,
        Promise.coroutine(function* () {
          return "mediaPath";
        }));

      mockMixin.logManager = mockFactory.mockLogging(mockMixin.logManager);

      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYER,
        function() {
          player.id = "test1";
          player.sync = Player.Sync.SYNCED;
          return player;
        });

      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYERS,
        function() {
          var players = new Map();
          player.id = "test1";
          player.sync = Player.Sync.SYNCED;
          players.set("test1", player);
          player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);
          player.id = "test2";
          player.sync = Player.Sync.SYNCED;
          players.set("test2", player);
          return players;
        });

      Object.assign(stateEngine, mockMixin);
      stateEngine.initialize();

      var result = yield stateEngine.pause("test1");
      should.deepEqual(result, [[["test1", "state-pause", true], ["test2", "state-pause", true]]], "The StateEngine did not return the pause event.");
    }));
  });

  describe('#seek()', function() {
    it('should send a message to players to seek to the requested timestamp', Promise.coroutine(function* () {
      var mockFactory = Object.create(MockFactory.prototype);
      yield mockFactory.initialize();

      var stateEngine = Object.create(StateEngine.prototype);

      var Player = mockFactory.getImport(mockFactory.ImportEnum.PLAYER);
      var player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);

      var mockMixin = mockFactory.createMockMixin([mockFactory.ImportEnum.LOGMANAGER, mockFactory.ImportEnum.SESSION,
        mockFactory.ImportEnum.PLAYERMANAGER]);
      mockMixin.session.pushReturn(mockMixin.session.Enum.GETMEDIAPATH,
        Promise.coroutine(function* () {
          return "mediaPath";
        }));

      mockMixin.logManager = mockFactory.mockLogging(mockMixin.logManager);

      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYER,
        function() {
          player.id = "test1";
          player.sync = Player.Sync.SYNCED;
          return player;
        });

      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYERS,
        function() {
          var players = new Map();
          player.id = "test1";
          player.sync = Player.Sync.SYNCED;
          players.set("test1", player);
          player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);
          player.id = "test2";
          player.sync = Player.Sync.SYNCED;
          players.set("test2", player);
          return players;
        });

      Object.assign(stateEngine, mockMixin);
      stateEngine.initialize();

      var result = yield stateEngine.seek("test1", 1000);
      should.deepEqual(result, [[["test1", "state-seek", 1000], ["test2", "state-seek", 1000]]], "The StateEngine did not return the seek event.");
    }));
  });

  describe('#pauseSync()', function() {
    it('should authenticate an invited user\'s token', Promise.coroutine(function* () {
      var mockFactory = Object.create(MockFactory.prototype);
      yield mockFactory.initialize();

      var stateEngine = Object.create(StateEngine.prototype);

      var Player = mockFactory.getImport(mockFactory.ImportEnum.PLAYER);
      var player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);

      var mockMixin = mockFactory.createMockMixin([mockFactory.ImportEnum.LOGMANAGER, mockFactory.ImportEnum.SESSION,
        mockFactory.ImportEnum.PLAYERMANAGER]);
      mockMixin.session.pushReturn(mockMixin.session.Enum.GETMEDIAPATH,
        Promise.coroutine(function* () {
          return "mediaPath";
        }));

      mockMixin.logManager = mockFactory.mockLogging(mockMixin.logManager);

      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYER,
        function() {
          player.id = "test1";
          player.sync = Player.Sync.SYNCED;
          return player;
        });

      var getPlayers = function() {
        var players = new Map();
        player.id = "test1";
        player.sync = Player.Sync.SYNCED;
        player.timestamp = 200;
        players.set("test1", player);
        player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);
        player.id = "test2";
        player.sync = Player.Sync.SYNCED;
        player.timestamp = 300;
        players.set("test2", player);
        return players;
      };

      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYERS,
        getPlayers);
      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYERS,
        getPlayers);

      Object.assign(stateEngine, mockMixin);
      stateEngine.initialize();

      var result = yield stateEngine.pauseSync("test2");
      should.deepEqual(result, [[["test2","state-seek",{ seekTime: 200}]]], "The StateEngine did not return the pauseSync event.");
    }));
  });

  describe('#changeSyncState()', function() {
    it('should authenticate an invited user\'s token', Promise.coroutine(function* () {
      var mockFactory = Object.create(MockFactory.prototype);
      yield mockFactory.initialize();

      var stateEngine = Object.create(StateEngine.prototype);

      var Player = mockFactory.getImport(mockFactory.ImportEnum.PLAYER);
      var player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);

      var mockMixin = mockFactory.createMockMixin([mockFactory.ImportEnum.LOGMANAGER, mockFactory.ImportEnum.SESSION,
        mockFactory.ImportEnum.PLAYERMANAGER]);
      mockMixin.session.pushReturn(mockMixin.session.Enum.GETMEDIAPATH,
        Promise.coroutine(function* () {
          return "mediaPath";
        }));

      mockMixin.logManager = mockFactory.mockLogging(mockMixin.logManager);

      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYER,
        function() {
          player.id = "test1";
          player.desynced = true;
          return player;
        });

      Object.assign(stateEngine, mockMixin);
      stateEngine.initialize();

      var result = yield stateEngine.changeSyncState("test1", 1);
      should.deepEqual(result, [0], "The StateEngine did not return the proper changeSync event.");
    }));
  });

  describe('#timeUpdate()', function() {
    it('should update the user\'s time and determine if user\'s video needs to be syncPaused', Promise.coroutine(function* () {
      var mockFactory = Object.create(MockFactory.prototype);
      yield mockFactory.initialize();

      var stateEngine = Object.create(StateEngine.prototype);

      var Player = mockFactory.getImport(mockFactory.ImportEnum.PLAYER);

      var mockMixin = mockFactory.createMockMixin([mockFactory.ImportEnum.LOGMANAGER, mockFactory.ImportEnum.SESSION,
        mockFactory.ImportEnum.PLAYERMANAGER, mockFactory.ImportEnum.SYNCRULE]);
      mockMixin.session.pushReturn(mockMixin.session.Enum.GETMEDIAPATH,
        Promise.coroutine(function* () {
          return "mediaPath";
        }));

      mockMixin.logManager = mockFactory.mockLogging(mockMixin.logManager);

      var getPlayers = function() {
        var players = new Map();
        var player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);
        player.id = "test1";
        player.sync = Player.Sync.SYNCED;
        player.timestamp = 200;
        players.set("test1", player);
        player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);
        player.id = "test2";
        player.sync = Player.Sync.SYNCED;
        player.timestamp = 6000;
        players.set("test2", player);
        return players;
      };

      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYERS,
        getPlayers);

      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYER,
        function() {
          var player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);
          player.id = "test2";
          player.sync = Player.Sync.SYNCED;
          player.timestamp = 6000;
          return player;
        });

      mockMixin.syncRule.pushReturn(mockMixin.syncRule.Enum.EVALUATE,
        function() {
          return true;
        });

      var ObjectFactory = mockFactory.getImport(mockFactory.ImportEnum.OBJECTFACTORY);
      mockMixin.factory = mockFactory.createMockObject(mockFactory.ImportEnum.OBJECTFACTORY, ObjectFactory.prototype);

      mockMixin.factory.pushReturn(mockMixin.factory.Enum.CREATESYNCRULE,
        Promise.coroutine(function* () {
          return mockMixin.syncRule;
        }));

      Object.assign(stateEngine, mockMixin);
      stateEngine.initialize();

      var result = yield stateEngine.timeUpdate("test2", 6001);
      should.deepEqual(result, [[["test2","state-pause", false]]], "The StateEngine did not trigger a pause event.");
    }));
  });

  describe('#syncingPing()', function() {
    it('should check to see if a user needs to be synchronized', Promise.coroutine(function* () {
      var mockFactory = Object.create(MockFactory.prototype);
      yield mockFactory.initialize();

      var stateEngine = Object.create(StateEngine.prototype);

      var Player = mockFactory.getImport(mockFactory.ImportEnum.PLAYER);

      var mockMixin = mockFactory.createMockMixin([mockFactory.ImportEnum.LOGMANAGER, mockFactory.ImportEnum.SESSION,
        mockFactory.ImportEnum.PLAYERMANAGER, mockFactory.ImportEnum.SYNCINGRULE]);
      mockMixin.session.pushReturn(mockMixin.session.Enum.GETMEDIAPATH,
        Promise.coroutine(function* () {
          return "mediaPath";
        }));
      mockMixin.session.pushReturn(mockMixin.session.Enum.GETMEDIASTARTED,
        Promise.coroutine(function* () { return true; }));

      mockMixin.logManager = mockFactory.mockLogging(mockMixin.logManager);

      var getPlayers = function() {
        var players = new Map();
        var player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);
        player.id = "test1";
        player.sync = Player.Sync.SYNCING;
        player.timestamp = 0;
        players.set("test1", player);
        player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);
        player.id = "test2";
        player.sync = Player.Sync.SYNCED;
        player.timestamp = 6000;
        players.set("test2", player);
        return players;
      };

      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYERS,
        getPlayers);
      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETSYNCEDPLAYERSSTATE, Player.State.PLAY);
      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYER,
        function() {
          var player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);
          player.id = "test1";
          player.sync = Player.Sync.SYNCING;
          player.timestamp = 0;
          return player;
        });

      mockMixin.syncingRule.pushReturn(mockMixin.syncingRule.Enum.EVALUATE,
        function() {
          var player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);
          player.id = "test2";
          player.sync = Player.Sync.SYNCED;
          player.timestamp = 6000;
          return player;
        });

      var ObjectFactory = mockFactory.getImport(mockFactory.ImportEnum.OBJECTFACTORY);
      mockMixin.factory = mockFactory.createMockObject(mockFactory.ImportEnum.OBJECTFACTORY, ObjectFactory.prototype);

      mockMixin.factory.pushReturn(mockMixin.factory.Enum.CREATESYNCINGRULE,
        Promise.coroutine(function* () {
          return mockMixin.syncingRule;
        }));

      Object.assign(stateEngine, mockMixin);
      stateEngine.initialize();

      var result = yield stateEngine.syncingPing("test1", 0);
      should.deepEqual(result, [[["test1","state-seek", {play:true, seekTime:6001, syncWait:true}]]], "The StateEngine did not trigger a seek event.");
    }));
  });
});
