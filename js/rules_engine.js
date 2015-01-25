var PM = require('./player_manager');

var rules_engine = function(){ 
	this.player_manager = new PM();
	this.command_manager = null;
	this.rules = {};
};
	
rules_engine.prototype.process_state = function(socket, data){
	
	var player = this.player_manager.get_player(socket.id);
	
	if(player !== undefined && player !== null){
		if (message.time_stamp != "0:00"){
			player.player_time = message.time_stamp;
		}
		
		for (var rule in this.rules) {
			this.rule.process_rule(message, player, this.player_manager)
		}
	}
};

module.exports = rules_engine;
