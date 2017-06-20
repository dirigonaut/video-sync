var LogManager    = require('../../log/LogManager');
var Player        = require('../../player/Player');

var log           = LogManager.getLog(LogManager.LogEnum.STATE);

function SyncRule() { }

SyncRule.prototype.evaluate = function(issuer, playerManager, fuzzyRange) {
  log.silly("SyncRule.evaluate");
  var players = playerManager.getPlayers();
  var sync = false;

  if(issuer.sync !== Player.Sync.DESYNCED) {
    for(var player of players.values()){
      if(player.sync === Player.Sync.SYNCED) {
        if(parseFloat(issuer.timestamp) - parseFloat(player.timestamp) > fuzzyRange) {
          sync = true;
          break;
        }
      }
  	}
  }

  if(sync) {
    return true;
  }
  
  return false;
};

module.exports = SyncRule;
