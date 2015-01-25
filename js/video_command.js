var p_manager = require('./player_manager');

function video_command(command, priority, data) {
    this.command = command;
    this.priority = priority;
    this.data = data;
    
    var self = this;
};

video_command.prototype.run = function(socket, status) {
	if(!this.executed){
		socket.emit("state", this.to_json, function(socket, status){
			self.executed(socket);
		});
	}
}

video_command.prototype.executed = function(socket, status) {
	var player_manager = new p_manager();
	var player = player_manager.get_player(socket.id);
	player.status = status;
}

video_command.prototype.to_json = function(){
	return "";
}

module.exports = video_command;
	
