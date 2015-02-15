var command = require('./video_command');

function pause_sync_rule(){
	this.time_disparity = 2.00;
	this.debug 			= true;
};

pause_sync_rule.prototype.process_rule = function(data, socket, manager){
	if(this.debug){console.log("Entering pause_sync_rule.");};
	if(data.command == null){
		var issuer = manager.get_player(socket.id);
		var others = manager.get_other_players(socket.id);

		var vetted = [];
		for (var player in others){
			if (Math.abs(parseFloat(issuer.timestamp) - parseFloat(others[player].timestamp)) > this.time_disparity
			&& parseFloat(issuer.timestamp) > parseFloat(others[player].timestamp)) {
				vetted.push(issuer);
				break;
			}
		}
		
		if(this.debug){console.log("Total vetted players: " + vetted.length);};

		for (var player in vetted){
			var video_command = new command("SYNC_PAUSE", "");
			video_command.run(vetted[player].id);
		}
	}
};

module.exports = pause_sync_rule;
