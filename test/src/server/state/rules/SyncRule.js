const Promise = require('bluebird');
const should  = require('should');

const SyncRule        = require('../../../../../src/server/state/rules/SyncRule');
const MockFactory     = require('../../../../mocks/MockFactory');

describe('SyncRule', function() {
  describe('#evaluate()', function() {
    it('should determine if a sync should be issued for a user', Promise.coroutine(function* () {
      var mockFactory = Object.create(MockFactory.prototype);
      yield mockFactory.initialize();

      var syncRule = Object.create(SyncRule.prototype);
      var Player = mockFactory.getImport(mockFactory.ImportEnum.PLAYER);

      var mockMixin = mockFactory.createMockMixin([mockFactory.ImportEnum.LOGMANAGER, mockFactory.ImportEnum.SESSION,
        mockFactory.ImportEnum.PLAYERMANAGER]);

      mockMixin.logManager = mockFactory.mockLogging(mockMixin.logManager);

      mockMixin.playerManager.pushReturn(mockMixin.playerManager.Enum.GETPLAYERS,
        function() {
          var players = new Map();
          var player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);
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
        });

      var player = mockFactory.createMockObject(mockFactory.ImportEnum.PLAYER, Player.prototype);
      player.id = "test1";
      player.sync = Player.Sync.SYNCED;
      player.timestamp = 200;

      Object.assign(syncRule, mockMixin);
      syncRule.log = mockMixin.logManager.getLog();

      var result = syncRule.evaluate(player, mockMixin.playerManager, true, 2);
      should.deepEqual(result[0].id, "test1", "The StateEngine did not return the proper set of players to trigger play for.");
      should.deepEqual(result.length, 1, "The StateEngine did not return the proper set of players to trigger play for.");
    }));
  });
});
