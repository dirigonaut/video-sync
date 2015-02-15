var player = require('./player');

function player_manager (){ 
	this.debug = true;
	this.players = new Map();
};

player_manager.prototype.create_player = function(socket){
    var new_player = new player(socket);
    this.players.set(new_player.id, new_player);
    console.log("Adding player, total players now: " + this.players.size);
};

player_manager.prototype.get_player = function(id){
    return this.players.get(id);
};

player_manager.prototype.get_players = function(){
    return this.players;
};

player_manager.prototype.remove_player = function(id){
    this.players.delete(id);
};

player_manager.prototype.get_other_players = function(id){
    var temp = new Array();
    for (var p of this.players.keys()) {
        if(this.players.get(p).id != id){
            temp.push(this.players.get(p));
        }
    }
    
    return temp;
};

player_manager.prototype.get_players_with = function(status){
    var temp = new Array();
    for (var p of this.players.keys()) {
        if(this.players.get(p).status == status){
            temp.push(this.players.get(p));
        }
    }
    
    return temp;
};

player_manager.prototype.get_players_without = function(status){
    var temp = new Array();
    for (var p of this.players.keys()) {
        if(this.players.get(p).status != status){
            temp.push(this.players.get(p));
        }
    }
    
    return temp;
};

module.exports = player_manager;
