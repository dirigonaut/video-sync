var PlayerManager = require('../../player/PlayerManager');
var Player        = require('../../player/Player');

var playerManager = new PlayerManager();

function SyncRule(fuzzyRange) {
  this.fuzzyRange = fuzzyRange;
}

SyncRule.prototype.evaluate = function(issuer, callback) {
  var players = playerManager.getPlayers();
  var issuees = [];
  var synced = true;

  if(issuer.sync !== Player.Sync.DESYNCED) {
    for(var player of players.values()){
      if(player.sync == Player.Sync.SYNCED && player.state == Player.State.PLAY) {
        if(Math.abs(parseFloat(issuer.timestamp) - parseFloat(player.timestamp)) > this.fuzzyRange) {
          issuees.push(player);
        }
      }
  	}
  }

  if(issuees.length > 0) {
    callback(issuees, "state-pause");
  }
};

module.exports = SyncRule;
