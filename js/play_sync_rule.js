var command = require('./video_command');

function play_sync_rule(){
	this.time_disparity = 1.00;
	this.debug 			= true;
};

play_sync_rule.prototype.process_rule = function(data, socket, manager){
	if(this.debug){console.log("Entering play_sync_rule.");};
	if(data.command == null){
		var issuer = manager.get_player(socket.id);
		var others = manager.get_players_with_status("SYNC_PAUSE");

		var vetted = [];
		for (var player in others){
			if (Math.abs(parseFloat(issuer.timestamp) - parseFloat(others[player].timestamp)) < this.time_disparity
			&& parseFloat(issuer.timestamp) > parseFloat(others[player].timestamp)) {
				vetted.push(others[player]);
			}
		}
		
		if(this.debug){console.log("Total vetted players: " + vetted.length);};

		for (var player in vetted){
			var video_command = new command("PLAY", "");
			video_command.run(vetted[player].id);
		}
	}
};

module.exports = play_sync_rule;
