var rule_1 		= require('./request_pause_play_rule');
var rule_2 		= require('./pause_sync_rule');
var rule_3 		= require('./play_sync_rule');

function rules_engine(){
	this.rules = [new rule_1(), new rule_2(), new rule_3()];
	this.debug = true;
};
	
rules_engine.prototype.process_rules = function(request, player_manager){
	var player = player_manager.get_player(request.socket.id);
	if(this.debug){console.log("Player: " + request.socket.id);};

	if(player !== undefined && player !== null){
		if (request.data.timestamp != NaN){
			if(this.debug){console.log("Timestamp update");};
			player.timestamp = request.data.timestamp;
		}

		if(this.debug){console.log("Running rules.");};

		for (var i in this.rules) {
			if(this.rules[i].process_rule(request, player_manager)){
				break;
			}
		}
	}
};

module.exports = rules_engine;
