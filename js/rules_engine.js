var rule_1 		= require('./request_pause_play_rule');
var rule_2 		= require('./pause_sync_rule');
var rule_3 		= require('./play_sync_rule');

function rules_engine(){ 
	this.rules = [new rule_1(), new rule_2(), new rule_3()];
};
	
rules_engine.prototype.process_rules = function(socket, data, player_manager){
	
	var player = player_manager.get_player(socket.id);
	
	if(player !== undefined && player !== null){
		if (data.time_stamp != "0:00"){
			player.timestamp = data.timestamp;
		}
		
		for (var rule in this.rules) {
			rule.process_rule(data, player, player_manager)
		}
	}
};

module.exports = rules_engine;
