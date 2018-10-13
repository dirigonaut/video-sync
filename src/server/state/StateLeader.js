const Events  = require('events');

var elected, termStart, playerInfo, playerManager, log;

function StateLeader() { }

StateLeader.prototype.initialize = function() {
  if(typeof StateLeader.prototype.protoInit === 'undefined') {
    StateLeader.prototype.protoInit = true;
    playerInfo      = this.factory.getPlayerInfo();
    playerManager   = this.factory.createPlayerManager();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.STATE);
  }
};

StateLeader.prototype.getLeader = function(limit) {
  log.info("StateLeader.getLeader");
  return elected && Math.abs((Date.now() / 1000) - termStart) < limit ? elected : electLeader(limit);
};

module.exports = StateLeader;

var electLeader = function(limit) {
  log.info("StateLeader._electLeader");
  var players = playerManager.getPlayers();
  var syncing = [];
  var issued = [];
  var synced = [];

  for(var player of players.values()) {
    if(player.sync === playerInfo.Enums.SYNC.SYNCED) {
      synced.push(player);
    } else if(player.sync === playerInfo.Enums.SYNC.ISSUED) {
      issued.push(player);
    } else if(player.sync === playerInfo.Enums.SYNC.SYNCING) {
      syncing.push(player);
    }
  }

  if(synced.length) {
    if(synced.length > 1) {
      synced.sort(compare);
      leader = getCandidate(playerInfo.Enums.SYNC.SYNCED, limit, synced);
    } else {
      leader = synced.pop();
    }

    termStart = Date.now() / 1000;
  } else if(issued.length) {
    if(syncing.length > 1) {
      issued.sort(compare);
      leader = getCandidate(playerInfo.Enums.SYNC.ISSUED, limit, issued);
    } else {
      leader = issued.pop();
    }

    leader.sync = playerInfo.Enums.SYNC.SYNCED;
    termStart = Date.now() / 1000;
  } else if(syncing.length) {
    if(syncing.length > 1) {
      syncing.sort(compare);
      leader = getCandidate(playerInfo.Enums.SYNC.SYNCING, limit, syncing);
    } else {
      leader = syncing.pop();
    }

    leader.sync = playerInfo.Enums.SYNC.SYNCED;
    termStart = Date.now() / 1000;
  }

  if(leader) {
    log.debug(`Elected leader state: `, leader);
    elected = leader;
  } else {
    throw new Error("Unable to elect a leader.");
  }
  
  return leader;
};

var compare = function(a, b) {
  return a.timestamp >= b.timestamp ? a.timestamp > b.timestamp ? 1 : 0 : -1;
}

var getCandidate = function(state, limit, array) {
  log.info("StateLeader._getCandidate");
  switch(state) {
    case playerInfo.Enums.SYNC.SYNCED:
      return array.pop();
    default:
      var min = array[0].timestamp;
      var max = array[array.length - 1].timestamp;
      var range = Math.abs(max - min);

      if(range < limit) {
        return array.shift();
      } else {
        var median = array[Math.ceil(array.length / 2)];
        var mean = array.reduce((accumulator, currentValue) =>
                                    accumulator + currentValue) / array.length();

        if(median === 0 && mean > median) {
          return array.pop();
        } else if(Math.abs(max - median) <= Math.abs(median - min)) {
          return array.pop();
        } else {
          return array.shift();
        }
      }
  }
};
