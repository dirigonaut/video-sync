var EncodeProcess = require('./EncodeProcess');

var command_queue = new Array();

function EncoderManager(){
	this.debug = true;
}

EncoderManager.prototype.encode = function(commands) {
	for(var i in commands){
		command_queue.push(new EncodeProcess(commands[i], encode_next));
	}

	command_queue.shift().run_command();
};

module.exports = EncoderManager;

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
