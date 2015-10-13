var p_manager = require('../player/player_manager');
var validate	= require('../utils/input_validator');
var	json_keys  = require('../utils/json_keys');

var val_util	= new validate();

function video_command(command, timestamp) {
    this.command 	  = command;
    this.timestamp	= timestamp;
    this.debug      = true;
};

video_command.prototype.run = function(socket) {
	if(this.debug){console.log("Command issued: " + JSON.stringify(this.to_json(socket)));};
	socket.emit("state", this.to_json(socket), function(dirty_data){
		var data			      = val_util.check_callback(dirty_data)
		var player_manager 	= new p_manager();
		var player 			    = player_manager.get_player(data.id);

		console.log(player.id + " current status: " + player.status + " new status: " + data[json_keys.COMMAND]);
		player.status = data[json_keys.COMMAND];
	});
};

video_command.prototype.to_json = function(socket){
  var json = {};

  json[json_keys.COMMAND]    = this.command;
  json[json_keys.TIMESTAMP]  = this.timestamp;
  json[json_keys.ID]         = socket.id;

	return json;
};

module.exports = video_command;
