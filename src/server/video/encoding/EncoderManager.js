const EventEmitter  = require('events');
const util = require('util');

var Command = require('./process/Command');
var Ffmpeg = require('./process/FfmpegProcess');
var Mp4Box = require('./process/Mp4BoxProcess');
var LogManager = require('../../log/LogManager');

const webm_manifest = "webm_dash_manifest";
const mp4_manifest = "-frag-rap";

var log = LogManager.getLog(LogManager.LogEnum.ENCODING);

function EncoderManager(data){
	log.debug("EncodingManager", data);
	var self = this;
	self.commands = [];
	self.postProcess = [];

	for(var i = 0; i < data.length; ++i){
		switch (data[i].codec) {
			case "ffmpeg" :
				log.silly("Found ffmpeg encoding", data[i]);
				var ffmpeg = new Ffmpeg(Command(data[i].input));
				setEvents(ffmpeg, self);
				self.commands.push(ffmpeg);

				if(data[i].input.includes(webm_manifest)) {
					self.postProcess.push(['webm', ffmpeg.command[ffmpeg.command.length - 1]]);
				}
			break;
			case "mp4Box" :
				log.silly("Found mp4Box encoding", data[i]);
				var mp4Box = new Mp4Box(Command(data[i].input));
				setEvents(mp4Box, self);
				self.commands.push(mp4Box);
			break;
			default:
				log.info("EncoderManager: " + command.codec + " is not supported process.");
			break;
		}
	}

	self.on('processed', function() {
		log.debug("EncodingManager.processed");
		if(self.commands.length > 0) {
			var command = self.commands.shift();
			command.process();
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
		var command = self.commands.shift();
		log.debug("EncodingManager.encode", command);
		command.process();
	};

	return self;
}

util.inherits(EncoderManager, EventEmitter);

module.exports = EncoderManager;

function setEvents(command, manager) {
	log.debug("EncodingManager - setEvents");
	command.on('start', function(command_line){
		log.debug("Server: Start encoding: " + new Date().getTime());
	}).on('progress', function(percent) {
		log.info(`encoding ${util.inspect(percent, { showHidden: false, depth: 1 })}`, percent);
	}).on('close', function(exitCode) {
		log.info('Server: file has been converted succesfully: ' + new Date().getTime());
		manager.emit('processed');
	}).on('error', function(err) {
		log.error("There was an error encoding: ", err);
	});
}
