var command = require('./video_command');

function request_pause_play_rule(){
    this.priority = 1;
};

request_pause_play_rule.prototype.process_rule = function(socket, data, manager){
	if(data.command != "null" && data.timestamp == "0:00"){
		var issuer = manager.get_player(socket.id);
		var others = manager.get_players_without_status("SYNC_PAUSE");

		var vetted = [];
		for (player in others){
			if (data.command != player.status){
				vetted.push(player);
			}
		}

		for (player in vetted){
			var video_command = new command(data.command, "");
			video_command.run(player.id);
		}
	}
};

module.exports = request_pause_play_rule;
