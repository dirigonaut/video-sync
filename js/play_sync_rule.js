var command = require('./video_command');

function play_sync_rule(){
	this.time_disparity = 1.00;
};

play_sync_rule.prototype.process_rule = function(socket, data, manager){
	if(data.command == "null" && data.timestamp != "0:00"){
		var issuer = manager.get_player(socket.id);
		var others = manager.get_players_with_status("SYNC_PAUSE");

		var vetted = [];
		for (player in others){
			if (Math.abs(parseFloat(issuer.timestamp) - parseFloat(player.timestamp)) < this.time_disparity
			&& parseFloat(issuer.timestamp) > parseFloat(player.timestamp)) {
				vetted.push(player);
			}
		}

		for (player in vetted){
			var video_command = new command("PLAY", "");
			video_command.run(player.id);
		}
	}
};

module.exports = play_sync_rule;
