var command = require('./video_command');

var play_sync(){
	this.priority = 1;
	this.time_disparity = 1.00;
}

play_sync.process_rule = function(socket, data, manager)
	var issuer = manager.get_player(socket.id);
	var others = manager.get_players_with_status("SYNC_PAUSE");

	var vetted = {}
    if (data.is_time_stamp_message){
		for (player in others){
			if parseFloat(issuer.player_time) > parseFloat(player.player_time) &&
				Math.abs(parseFloat(player.player_time) - parseFloat(issuer.player_time)){
				vetted.push(player);
			}
		}
	}

    for (player in vetted){
		var video_command = new command("PLAY", this.priority, "");
		video_command.run(player.id);
	}
}
