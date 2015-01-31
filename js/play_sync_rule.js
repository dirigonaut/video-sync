var command = require('./video_command');

function play_sync_rule(){
	this.priority = 1;
	this.time_disparity = 1.00;
};

play_sync_rule.prototype.process_rule = function(socket, data, manager)
	var issuer = manager.get_player(socket.id);
	var others = manager.get_players_with_status("SYNC_PAUSE");

	var vetted = [];
    if (data.timestamp != ""){
		for (player in others){
			if (parseFloat(issuer.timestamp) > parseFloat(player.timestamp) &&
			Math.abs(parseFloat(player.timestamp) - parseFloat(issuer.timestamp))){
				vetted.push(player);
			}
		}
	}

    for (player in vetted){
		var video_command = new command("PLAY", this.priority, "");
		video_command.run(player.id);
	}
};

module.exports = play_sync_rule;
