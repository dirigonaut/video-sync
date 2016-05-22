var player = require('./Player');

var players = new Map();

function PlayerManager (){
};

PlayerManager.prototype.createPlayer = function(socket){
  var newPlayer = new player(socket);
  players.set(socket.id, newPlayer);
  console.log("Adding player, total players now: " + players.size);
};

PlayerManager.prototype.getPlayer = function(id){
  return players.get(id);
};

PlayerManager.prototype.getPlayers = function(){
  return players;
};

PlayerManager.prototype.removePlayer = function(id){
  this.players.delete(id);
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

module.exports = PlayerManager;
