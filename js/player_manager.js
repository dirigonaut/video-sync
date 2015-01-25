var player = require('./player');

function player_manager (){ 
	this.init();
};

player_manager.prototype.init = function() {
	this.prototype.players = {};
}

player_manager.prototype.create_player = function(socket){
    var new_player = new player(socket);
    this.players.set(new_player.id, new_player);
};

player_manager.prototype.get_player = function(id){
    return this.players.get(id);
};

player_manager.prototype.remove_player = function(id){
    this.players.delete(id); 
};

player_manager.prototype.get_other_players = function(id){
    var temp = {};
    for (var p in this.players) {
        if(p.id != socket.id){ 
            temp.push(p);
        }
    }
    
    return temp;
};

player_manager.prototype.get_players_with = function(status){
    var temp = {};
    for (var p in this.players) {
        if(p.status == status){ 
            temp.push(p);
        }
    }
    
    return temp;
};

player_manager.prototype.get_players_without = function(status){
    var temp = {};
    for (var p in this.players) {
        if(p.status != status){ 
            temp.push(p);
        }
    }
    
    return temp;
};

module.exports = player_manager;
