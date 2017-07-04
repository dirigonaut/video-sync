const Promise = require('bluebird');
const Events  = require('events');
const Util 	  = require('util');

const webm_manifest = "webm_dash_manifest";
const mp4_manifest = "-frag-rap";

var socketLog, command, encoding, processes, log;

function EncoderManager() { }

EncoderManager.prototype.initialize = function(force) {
	if(typeof EncoderManager.prototype.protoInit === 'undefined') {
    EncoderManager.prototype.protoInit = true;
		command			    = this.factory.createCommand();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ENCODING);
  }

	if(force === undefined ? typeof EncoderManager.prototype.stateInit === 'undefined' : force) {
    EncoderManager.prototype.stateInit = true;
		Object.assign(this.prototype, Events.prototype);
    socketLog		    = this.factory.createSocketLog();
		encoding				= false;
  }
};

EncoderManager.prototype.buildProcess = function(data) {
	var processes = [];
	for(var i = 0; i < data.length; ++i) {
		switch (data[i].codec) {
			case "ffmpeg" :
				log.silly("Found ffmpeg encoding", data[i]);
				var ffmpeg = this.factory.createFfmpeg();
				ffmpeg.setCommand(command.parse(data[i].input));
				processes.push(ffmpeg);

				if(data[i].input.includes(webm_manifest)) {
					var webm = this.factory.createWebmMetaProcess();
					webm.setCommand(ffmpeg.command[ffmpeg.command.length - 1]);
					processes.push(webm);
				}
			break;
			case "mp4Box" :
				log.silly("Found mp4Box encoding", data[i]);
				var mp4Box = this.factory.createMp4Box();
				mp4Box.setCommand(command.parse(data[i].input));
				processes.push(mp4Box);
			break;
			default:
				log.info("EncoderManager: " + command.codec + " is not supported process.");
			break;
		}
	}

	return processes;
};

EncoderManager.prototype.encode = function(operations) {
	log.debug("EncodingManager.encode");
	var promise;

	if(Array.isArray(operations)) {
		processes = processes ? processes.push(operations) : operations;
	} else {
		throw new Error(`EncodingManager.encode: ${operations} must be of type array.`);
	}

	if(!encoding) {
		itterator.call(this);
		encoding = true;
		this.emit('processed');

		promise = new Promise(function(resolve, reject) {
			this.once('finished', resolve);
			this.once('error', reject);
		});
	} else {
		promise = new Promise().resolve('Queued encoding processes.');
	}

	return promise;
};

module.exports = EncoderManager;

function itterator() {
	this.on('processed', Promise.coroutine(function* () {
		if(processes.length > 0) {
			var process = processes.shift();
			attachEvents.call(this, process);
			yield process.execute();
		} else {
			process.removeAllListeners('processed');
			this.emit('finished', 'All files encoded.');
			encoding = false;
		}
	}.bind(this)));
}

function attachEvents(process) {
	process.on('start', function() {
		log.debug("Server: Start encoding: " + new Date().getTime());
	}).on('progress', function(percent) {
		socketLog.log("encoding", percent);
	}).on('close', function(exitCode) {
		log.info('Server: file has been converted succesfully: ' + new Date().getTime());
		socketLog.log('Server: file has been converted succesfully: ' + new Date().getTime());
		removeEvents(process);
		this.emit('processed');
	}.bind(this)).on('error', function(err) {
		log.error("There was an error encoding: ", err);
		removeEvents(process);
		this.emit('error');
	}.bind(this));
}

function removeEvents(process) {
	process.removeAllListeners("start");
	process.removeAllListeners("progress");
	process.removeAllListeners("close");
	process.removeAllListeners("error");
}
