var PlayerManager = require('../player/PlayerManager');
var Player        = require('../player/Player');

var playerManager = new PlayerManager();

function SyncRule(fuzzyRange) {
  this.fuzzyRange = fuzzyRange;
}

SyncRule.prototype.evaluate = function(issuer, callback) {
  var players = playerManager.getPlayers();
  var issuees = [];
  var synced = true;

  if(issuer.sync !== Player.Sync.DESYNCED) {
    for(var player of players){
      if(player[1].sync == Player.Sync.SYNCED && player[1].state == Player.State.PLAY) {
        if(Math.abs(parseFloat(issuer.timestamp) - parseFloat(player[1].timestamp)) < this.fuzzyRange) {
          issuees.push(player[1]);
        }
      }
  	}
  }

  if(issuees.length > 0) {
    callback(playerManager.getPlayers(), "state-pause");
  }
};

module.exports = SyncRule;
