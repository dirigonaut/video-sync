var player = require('./player');

var players = new Map();

function player_manager (){ 
	this.debug = true;
};

player_manager.prototype.create_player = function(socket){
    var new_player = new player(socket);
    players.set(new_player.id, new_player);
    console.log("Adding player, total players now: " + players.size);
};

player_manager.prototype.get_player = function(id){
    return players.get(id);
};

player_manager.prototype.get_players = function(){
    return players;
};

player_manager.prototype.remove_player = function(id){
    this.players.delete(id);
};

player_manager.prototype.get_other_players = function(id){
    var temp = new Array();
    for (var p of players.keys()) {
        if(players.get(p).id != id){
            temp.push(players.get(p));
        }
    }
    
    return temp;
};

player_manager.prototype.get_players_with = function(status){
    var temp = new Array();
    for (var p of players.keys()) {
        if(players.get(p).status == status){
            temp.push(players.get(p));
        }
    }
    
    return temp;
};

player_manager.prototype.get_players_without = function(status){
    var temp = new Array();
    for (var p of players.keys()) {
        if(players.get(p).status != status){
            temp.push(players.get(p));
        }
    }
    
    return temp;
};

module.exports = player_manager;
