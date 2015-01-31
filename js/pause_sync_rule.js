var command = require('./video_command');

function pause_sync_rule(){
	this.priority = 2;
	this.time_disparity = 2.00;
};

pause_sync_rule.prototype.process_rule = function(socket, data, manager)
	var issuer = manager.get_player(socket.id);
	var others = manager.get_other_players(socket.id);

	var vetted = [];
    if (data.timestamp != ""){
		for (player in others){
			if (Math.abs(parseFloat(issuer.timestamp) - parseFloat(player.timestamp)) > this.time_disparity
			&& parseFloat(issuer.timestamp) > parseFloat(player.timestamp)) {
				vetted.push(issuer);
				break;
			}
		}
	}

    for (player in vetted){
		var video_command = new command("SYNC_PAUSE", this.priority, "");
		video_command.run(player.id);
	}
};

module.exports = pause_sync_rule;
