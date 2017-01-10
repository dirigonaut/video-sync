var Player = require('./Player');

var players = new Map();

function PlayerManager (){
};

PlayerManager.prototype.createPlayer = function(socket){
  var newPlayer = new Player(socket);
  players.set(socket.id, newPlayer);
  console.log("Adding player, total players now: " + players.size);
};

PlayerManager.prototype.getPlayer = function(id){
  var player = players.get(id);

  if(player === null || player === undefined) {
    player = players.get("/#" + id);
  }
  return player;
};

PlayerManager.prototype.getPlayers = function(){
  return players;
};

PlayerManager.prototype.removePlayer = function(id){
  players.delete(id);

  var player = players.get(id);

  if(player === null || player === undefined) {
    player = players.delete("/#" + id);
  }
};

PlayerManager.prototype.getOtherPlayers = function(id){
  var temp = new Array();
  for (var p of players.keys()) {
    if(p != id){
      temp.push(players.get(p));
    }
  }
  return temp;
};

PlayerManager.prototype.getPlayersWith = function(status){
  var temp = new Array();
  for (var p of players.keys()) {
    if(players.get(p).status == status){
      temp.push(players.get(p));
    }
  }
  return temp;
};

PlayerManager.prototype.getPlayersWithout = function(status){
  var temp = new Array();
  for (var p of players.keys()) {
    if(players.get(p).status != status){
      temp.push(players.get(p));
    }
  }
  return temp;
};

PlayerManager.prototype.removePlayersWithStatus = function(playerArray, status){
  var temp = new Array();
  for (var p in playerArray) {
    if(playerArray[p].status != status){
      temp.push(playerArray[p]);
    }
  }
  return temp;
};

PlayerManager.prototype.removePlayersWithId = function(playerArray, id){
  var temp = new Array();
  for (var p in playerArray) {
    if(playerArray[p].id != id){
      temp.push(playerArray[p]);
    }
  }
  return temp;
};

PlayerManager.prototype.getHandles = function() {
  var temp = new Array();
  for (var p of players.keys()) {
    temp.push([players.get(p).socket.id, players.get(p).handle]);
  }
  return temp;
};

module.exports = PlayerManager;
