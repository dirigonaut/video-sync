var encode_command = require('./encode_command');

var command_queue = new Array();

function video_encoder(){
	this.debug = true;
}

video_encoder.prototype.encode = function(ffmpeg_commands) {
	for(var i in ffmpeg_commands){
		command_queue.push(new encode_command(ffmpeg_commands[i], encode_next));
	}

	command_queue.shift().run_command();
};

module.exports = video_encoder;

function encode_next() {
	console.log("Get next encoding");
	if(command_queue){
	  var next = command_queue.shift();
		if(next){
			console.log("Starting next encoding");
		  next.run_command();
		} else {
			console.log('Finished encoding files.');
		}
	}
};
