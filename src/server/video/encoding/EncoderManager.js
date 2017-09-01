const Promise = require('bluebird');
const Events  = require('events');
const Util 	  = require('util');

const webm_manifest = "webm_dash_manifest";
const mp4_manifest = "-frag-rap";

var command, encoding, processes, log;

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
		Object.setPrototypeOf(EncoderManager.prototype, Events.prototype);
		encoding				= false;
		processes 			= [];
  }
};

EncoderManager.prototype.buildProcess = function(data) {
	var processes = [];
	for(var i = 0; i < data.length; ++i) {
		switch (data[i].encoder) {
			case "ffmpeg" :
				log.silly("Found ffmpeg encoding", data[i]);
				var ffmpeg = this.factory.createFfmpegProcess();
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
				var mp4Box = this.factory.createMp4BoxProcess();
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
		processes = processes ? processes.concat(operations) : operations;
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
		}.bind(this));
	} else {
		promise = new Promise.resolve(function() { return 'Queued encoding processes.'; });
	}

	return promise;
};

module.exports = EncoderManager;

function itterator() {
	this.on('processed', Promise.coroutine(function* (oldProcess) {
		if(processes.length > 0) {
			var process = processes.shift();
			attachEvents.call(this, process);
			yield process.execute().catch(log.error);
		} else {
			this.emit('finished', 'All files encoded.');
			encoding = false;
		}

		if(oldProcess) {
			oldProcess.removeAllListeners('processed');
		}
	}.bind(this)));
}

function attachEvents(process) {
	process.on('start', function() {
		log.debug('Server: Start encoding: ' + new Date().getTime());
		log.socket('Server: Start encoding at : ' + new Date().getTime());
	}).on('data', function(percent) {
		log.socket('data', percent);
	}).on('exit', function(exitCode) {
		if(!exitCode) {
			log.info('Server: file has been converted succesfully: ' + new Date().getTime());
			log.socket('Server: file has been converted succesfully: ' + new Date().getTime());
		} else {
			log.info(`Server: failed with error code: ${exitCode}, ` + new Date().getTime());
			log.socket(`Server: failed with error code: ${exitCode}, ` + new Date().getTime());
		}

		removeEvents(process);
		this.emit('processed', process);
	}.bind(this)).on('error', function(err) {
		log.error('There was an error encoding: ', err);
		log.socket('There was an error encoding: ', err);
	}.bind(this));
}

function removeEvents(process) {
	process.removeAllListeners("start");
	process.removeAllListeners("data");
	process.removeAllListeners("exit");
	process.removeAllListeners("error");
}
