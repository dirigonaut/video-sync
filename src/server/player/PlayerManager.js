var Player      = require('./Player');
var LogManager  = require('../log/LogManager');

var players = new Map();
var log     = LogManager.getLog(LogManager.LogEnum.STATE);

function PlayerManager () {
};

PlayerManager.prototype.createPlayer = function(id, handle) {
  var newPlayer = new Player(id, handle);
  players.set(id, newPlayer);
  log.info(`Adding player ${id}, total players now: ${players.size}`);
};

PlayerManager.prototype.getPlayer = function(id, callback) {
  log.silly("PlayerManager.getPlayer", id);
  var player = players.get(id);

  if(player === null || player === undefined) {
    player = players.get("/#" + id);
  }
  return player;
};

PlayerManager.prototype.getPlayerIds = function(callback) {
  var temp = new Array();
  for(var p of players.keys()) {
    temp.push(players.get(p).id);
  }

  if(callback) {
    callback(temp);
  } else {
    return temp;
  }
};

PlayerManager.prototype.getPlayers = function(callback) {
  if(callback) {
    callback(players);
  } else {
    return players;
  }
};

PlayerManager.prototype.removePlayer = function(id) {
  log.debug("PlayerManager.removePlayer", id);
  players.delete(id);

  var player = players.get(id);

  if(player === null || player === undefined) {
    player = players.delete("/#" + id);
  }
};

PlayerManager.prototype.getOtherPlayers = function(id, callback) {
  log.silly("PlayerManager.getOtherPlayers", id);
  var temp = new Array();
  for(var p of players.keys()) {
    if(p != id){
      temp.push(players.get(p));
    }
  }

  if(callback) {
    callback(temp);
  } else {
    return temp;
  }
};

PlayerManager.prototype.getSyncedPlayersState = function(callback) {
  log.silly("PlayerManager.getSyncedPlayersState");
  var state = null;
  for(var p of players.keys()) {
    if(players.get(p).sync === Player.Sync.SYNCED) {
      state = players.get(p).state;
      break;
    }
  }

  if(callback) {
    callback(state);
  } else {
    return state;
  }
};

PlayerManager.prototype.removePlayersWithId = function(playerArray, id, callback) {
  log.silly("PlayerManager.removePlayersWithId", id);
  var temp = new Array();
  for(var p in playerArray) {
    if(playerArray[p].id != id) {
      temp.push(playerArray[p]);
    }
  }

  if(callback) {
    callback(temp);
  } else {
    return temp;
  }
};

PlayerManager.prototype.getHandles = function(callback) {
  log.silly("PlayerManager.getHandles");
  var temp = new Array();
  for(var p of players.keys()) {
    temp.push([players.get(p).id, players.get(p).handle]);
  }

  if(callback) {
    callback(temp);
  } else {
    return temp;
  }
};

PlayerManager.prototype.setPlayerHandle = function(id, handle, callback) {
  log.silly("PlayerManager.setPlayerHandle", id);
  for(var p of players.keys()) {
    if(p === id) {
      players.get(p).setHandle(handle);

      var handles = new Array();
      for(var p of players.keys()) {
        handles.push([players.get(p).id, players.get(p).handle]);
      }

      callback(handles);
      break;
    }
  }
};

PlayerManager.prototype.initPlayers = function() {
  for(var p of players.keys()) {
    players.get(p).init();
  }
}

module.exports = PlayerManager;
