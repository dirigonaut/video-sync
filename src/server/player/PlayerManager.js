var Player      = require('./Player');
var LogManager  = require('../log/LogManager');

var players = new Map();
var log     = LogManager.getLog(LogManager.LogEnum.STATE);

function PlayerManager () {
};

PlayerManager.prototype.createPlayer = function(socket, handle) {
  var newPlayer = new Player(socket, handle);
  players.set(socket.id, newPlayer);
  log.info("Adding player, total players now: " + players.size);
};

PlayerManager.prototype.getPlayer = function(id) {
  log.silly("PlayerManager.getPlayer", id);
  var player = players.get(id);

  if(player === null || player === undefined) {
    player = players.get("/#" + id);
  }
  return player;
};

PlayerManager.prototype.getPlayers = function() {
  return players;
};

PlayerManager.prototype.removePlayer = function(id) {
  log.debug("PlayerManager.removePlayer", id);
  players.delete(id);

  var player = players.get(id);

  if(player === null || player === undefined) {
    player = players.delete("/#" + id);
  }
};

PlayerManager.prototype.getOtherPlayers = function(id) {
  log.silly("PlayerManager.getOtherPlayers", id);
  var temp = new Array();
  for(var p of players.keys()) {
    if(p != id){
      temp.push(players.get(p));
    }
  }
  return temp;
};

PlayerManager.prototype.getSyncedPlayersState = function() {
  log.silly("PlayerManager.getSyncedPlayersState");
  var state = null;
  for(var p of players.keys()) {
    if(players.get(p).sync === Player.Sync.SYNCED) {
      state = players.get(p).state;
      break;
    }
  }
  return state;
};

PlayerManager.prototype.removePlayersWithId = function(playerArray, id) {
  log.silly("PlayerManager.removePlayersWithId", id);
  var temp = new Array();
  for(var p in playerArray) {
    if(playerArray[p].id != id) {
      temp.push(playerArray[p]);
    }
  }
  return temp;
};

PlayerManager.prototype.getHandles = function() {
  log.silly("PlayerManager.getHandles");
  var temp = new Array();
  for(var p of players.keys()) {
    temp.push([players.get(p).socket.id, players.get(p).handle]);
  }
  return temp;
};

PlayerManager.prototype.setPlayerHandle = function(id, handle) {
  log.silly("PlayerManager.setPlayerHandle", id);
  for(var p of players.keys()) {
    if(p === id) {
      players.get(p).setHandle(handle);

      var handles = new Array();
      for(var p of players.keys()) {
        handles.push([players.get(p).socket.id, players.get(p).handle]);
      }

      sendEventToAllPlayers('chat-handles', handles);
      break;
    }
  }
};

module.exports = PlayerManager;

function sendEventToAllPlayers(event, payload) {
  for(var p of players.keys()) {
    players.get(p).socket.emit(event, payload);
  }
}
