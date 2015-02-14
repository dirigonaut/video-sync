var command = require('./video_command');

function pause_sync_rule(){
	this.time_disparity = 2.00;
};

pause_sync_rule.prototype.process_rule = function(socket, data, manager){
	if(data.command == "null" && data.timestamp != "0:00"){
		var issuer = manager.get_player(socket.id);
		var others = manager.get_other_players(socket.id);

		var vetted = [];
		for (player in others){
			if (Math.abs(parseFloat(issuer.timestamp) - parseFloat(player.timestamp)) > this.time_disparity
			&& parseFloat(issuer.timestamp) > parseFloat(player.timestamp)) {
				vetted.push(issuer);
				break;
			}
		}

		for (player in vetted){
			var video_command = new command("SYNC_PAUSE", "");
			video_command.run(player.id);
		}
	}
};

module.exports = pause_sync_rule;
