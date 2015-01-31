var command = require('./video_command');

function request_pause_play_rule(){
    this.priority = 1;
};

request_pause_play_rule.prototype.process_rule = function(socket, data, manager)
	var issuer = manager.get_player(socket.id);
	var others = manager.get_players_without_status("SYNC_PAUSE");

	var vetted = [];
    if (data.timestamp == ""){
		for (player in others){
			if (player.command.priority <= this.priority && data.command != player.status){
				vetted.push(player);
			}
		}
	}

    for (player in vetted){
		var video_command = new command(data.command, this.priority, "");
		video_command.run(player.id);
	}
};

module.exports = request_pause_play_rule;
