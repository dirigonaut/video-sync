var LogManager    = require('../../log/LogManager');
var PlayerManager = require('../../player/PlayerManager');
var Player        = require('../../player/Player');
var Session       = require('../../administration/Session');

var log           = LogManager.getLog(LogManager.LogEnum.STATE);
var playerManager = new PlayerManager();
var session       = new Session();

function PlayRule(fuzzyRange) {
  this.fuzzyRange = fuzzyRange;
}

PlayRule.prototype.evaluate = function(issuer, callback) {
  log.debug("PlayRule.evaluate");
  _this = this;

  var handleSessionResults = function(err, mediaStarted) {
    if(err) {
      log.error(err);
    } else {
    	var players = playerManager.getPlayers();
      var issuees = [];

      if(issuer.sync === Player.Sync.DESYNCED) {
        log.silly("PlayRule triggered", [issuer]);
        callback([issuer]);
      } else {
        for(var player of players) {
          if(player[1].sync === Player.Sync.SYNCED || (mediaStarted === false && player[1].isInit())) {
            if(Math.abs(parseFloat(issuer.timestamp) - parseFloat(player[1].timestamp)) < _this.fuzzyRange) {
              issuees.push(player[1]);
            }
          }
      	}
      }

      if(issuees.length > 0) {
        log.debug("PlayRule triggered", issuees);
        callback(issuees);
      }
    }
  };

  session.getMediaStarted(handleSessionResults);
};

module.exports = PlayRule;
