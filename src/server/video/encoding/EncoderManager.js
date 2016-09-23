const EventEmitter  = require('events');
const util = require('util');

var Command = require('./process/Command');
var Ffmpeg = require('./process/FfmpegProcess');
var Mp4Box = require('./process/Mp4BoxProcess');
var Logger = require('../utils/Logger');

const webm_manifest = "webm_dash_manifest";

var log = new Logger();

function EncoderManager(data){
	console.log("EncodingManager");
	var self = this;
	self.commands = [];
	self.postProcess = [];

	for(var i = 0; i < data.length; ++i){
		switch (data[i].process) {
			case "webm" :
				var ffmpeg = new Ffmpeg(Command(data[i].input));
				setEvents(ffmpeg, self);
				self.commands.push(ffmpeg);

				if(data[i].input.includes(webm_manifest)) {
					self.postProcess.push([data[i].process, ffmpeg.options[ffmpeg.options.length -1]]);
				}
			break;
			case "mp4box" :
				var mp4Box = new Mp4Box(new Command(data[i].input));
				setEvents(mp4Box);
				self.commands.push(mp4Box, self);
			break;
			default:
				console.log("EncoderManager: " + command.process + " is not supported process.");
			break;
		}
	}

	self.on('processed', function() {
		if(self.commands.length > 0) {
			var command = self.commands.shift();
			command.start();
		} else {
			if(self.postProcess.length > 0) {
				for(var x in self.postProcess){
					self.emit(self.postProcess[x][0], self.postProcess[x][1]);
				}
			} else {
				self.emit("finished");
			}
		}
	});

	self.encode = function() {
		console.log("EncodingManager.encode");
		var command = self.commands.shift();
		command.start();
	};

	return self;
}

util.inherits(EncoderManager, EventEmitter);

module.exports = EncoderManager;

function setEvents(command, manager) {
	console.log("EncodingManager - setEvents");
	command.on('start', function(command_line){
		console.log("Server: Start encoding: " + new Date().getTime());
	}).on('progress', function(percent) {
		console.log(percent);
		console.log(new Date().getTime());
	}).on('close', function() {
		console.log('Server: file has been converted succesfully: ' + new Date().getTime());
		manager.emit('processed');
	}).on('error', function(err) {
		console.log(err);
	});
}
