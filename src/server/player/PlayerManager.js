const Promise   = require('bluebird');
const Player    = require('./Player');

var players;

function PlayerManager () {
};

PlayerManager.prototype.initialize = function() {
  if(typeof PlayerManager.prototype.lazyInit === 'undefined') {

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.PLAYER);

    PlayerManager.prototype.lazyInit = true;
  }

  players = new Map();
};

PlayerManager.prototype.createPlayer = function(id, handle) {
  var newPlayer = new Player(id, handle);
  players.set(id, newPlayer);
  log.info(`Adding player ${id}, total players now: ${players.size}`);

  return Promise.resolve();
};

PlayerManager.prototype.getPlayer = function(id, callback) {
  log.silly("PlayerManager.getPlayer", id);
  var player = players.get(id);

  if(player === null || player === undefined) {
    player = players.get("/#" + id);
  }

  return Promise.resolve(player);
};

PlayerManager.prototype.getPlayerIds = function(callback) {
  var temp = [];
  for(var p of players.keys()) {
    temp.push(players.get(p).id);
  }

  return Promise.resolve(temp);
};

PlayerManager.prototype.getPlayers = function() {
  return Promise.resolve(players);
};

PlayerManager.prototype.removePlayer = function(id) {
  log.debug("PlayerManager.removePlayer", id);
  players.delete(id);

  var player = players.get(id);

  if(player === null || player === undefined) {
    player = players.delete("/#" + id);
  }

  return Promise.resolve();
};

PlayerManager.prototype.getOtherPlayers = function(id) {
  log.silly("PlayerManager.getOtherPlayers", id);
  var temp = [];
  for(var p of players.keys()) {
    if(p != id){
      temp.push(players.get(p));
    }
  }

  return Promise.resolve(temp);
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

  return Promise.resolve(state);
};

PlayerManager.prototype.removePlayersWithId = function(playerArray, id) {
  log.silly("PlayerManager.removePlayersWithId", id);
  var temp = [];
  for(var p in playerArray) {
    if(playerArray[p].id != id) {
      temp.push(playerArray[p]);
    }
  }

  return Promise.resolve(temp);
};

PlayerManager.prototype.getHandles = function() {
  log.silly("PlayerManager.getHandles");
  var temp = [];
  for(var p of players.keys()) {
    temp.push([players.get(p).id, players.get(p).handle]);
  }

  return Promise.resolve([temp]);
};

PlayerManager.prototype.setPlayerHandle = function(id, handle) {
  log.silly("PlayerManager.setPlayerHandle", id);
  var handles = [];

  for(var p of players.keys()) {
    if(p === id) {
      players.get(p).setHandle(handle);

      for(var p of players.keys()) {
        handles.push([players.get(p).id, players.get(p).handle]);
      }

      break;
    }
  }

  return Promise.resolve(handles);
};

PlayerManager.prototype.initPlayers = function() {
  for(var p of players.keys()) {
    players.get(p).init();
  }

  return Promise.resolve();
};

module.exports = PlayerManager;
