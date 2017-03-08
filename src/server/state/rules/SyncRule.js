var LogManager    = require('../../log/LogManager');
var PlayerManager = require('../../player/PlayerManager');
var Player        = require('../../player/Player');

var log           = LogManager.getLog(LogManager.LogEnum.STATE);
var playerManager = new PlayerManager();

function SyncRule(fuzzyRange) {
  this.fuzzyRange = fuzzyRange;
}

SyncRule.prototype.evaluate = function(issuer, callback) {
  log.silly("SyncRule.evaluate");
  var players = playerManager.getPlayers();
  var sync = false;

  if(issuer.sync !== Player.Sync.DESYNCED) {
    for(var player of players.values()){
      if(player.sync === Player.Sync.SYNCED) {
        if(parseFloat(issuer.timestamp) - parseFloat(player.timestamp) > this.fuzzyRange) {
          sync = true;
          break;
        }
      }
  	}
  }

  if(sync) {
    log.silly(`Sync triggered ${issuer.socket.id} ${issuer.timestamp}`);
    callback(issuer, "state-pause");
  }
};

module.exports = SyncRule;
