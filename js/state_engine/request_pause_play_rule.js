var command = require('./video_command');

function request_pause_play_rule(){
    this.debug 		= true;
};

request_pause_play_rule.prototype.process_rule = function(request, player_manager){
	var triggered = false;

	if(this.debug){console.log("Entering request_pause_play_rule.");};

	if(request.data.command && request.data.command !== ""){
		var players = player_manager.get_players_without("sync_pause");

		var vetted = [];
		for (var player in players){
			if (request.data.command != players[player].status){
				vetted.push(players[player]);
			}
		}

		if(this.debug){console.log("Total vetted players: " + vetted.length);};
		
		triggered = vetted.length > 0 ? true : false;

		for (var player in vetted){
			var video_command = new command(request.data.command, "");
			video_command.run(vetted[player].socket);
		}
	}

	return triggered;
};

module.exports = request_pause_play_rule;
