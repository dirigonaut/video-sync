var rule_1 		= require('./request_pause_play_rule');
var rule_2 		= require('./pause_sync_rule');
var rule_3 		= require('./play_sync_rule');

function rules_engine(){ 
	this.rules = [new rule_1()];
	this.debug = true;
};
	
rules_engine.prototype.process_rules = function(data, socket, player_manager){
	var player = player_manager.get_player(socket.id);
	if(this.debug){console.log("Player: " + socket.id);};
	
	if(player !== undefined && player !== null){
		if (data.timestamp != ""){
			if(this.debug){console.log("Timestamp update");};
			player.timestamp = data.timestamp;
		}
		
		if(this.debug){console.log("Running rules.");};
		
		for (var rule in this.rules) {
			this.rules[rule].process_rule(data, socket, player_manager);
		}
	}
};

module.exports = rules_engine;
