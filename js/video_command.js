var p_manager = require('./player_manager');

function video_command(command, timestamp) {
    this.command 	= command;
    this.timestamp	= timestamp;
};

video_command.prototype.run = function(socket, status) {
	socket.emit("state", this.to_json, function(socket, status){
		var player_manager = new p_manager();
		var player = player_manager.get_player(socket.id);
		player.status = status;
	});
};

video_command.prototype.to_json = function(){
	return JSON.stringify({"command:"+ this.command +"timestamp:"+ this.timestamp});
};

module.exports = video_command;
	
