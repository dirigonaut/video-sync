const Promise = require('bluebird');
const Events  = require('events');
const Crypto  = require('crypto');

const webm_manifest = "webm_dash_manifest";
const mp4_manifest = "-frag-rap";

var command, encoding, processes, current, log;

function EncoderManager() { }

EncoderManager.prototype.initialize = function() {
	if(typeof EncoderManager.prototype.protoInit === 'undefined') {
    EncoderManager.prototype.protoInit = true;
		Object.setPrototypeOf(EncoderManager.prototype, Events.prototype);
		encoding				= false;
		processes 			= [];

		command			    = this.factory.createCommand();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);

		processedEvent.call(this);
  }
};

EncoderManager.prototype.buildProcess = function(data) {
	var processes = [];
	for(var i = 0; i < data.length; ++i) {
		switch (data[i].encoder) {
			case "ffmpeg" :
				log.debug("Found ffmpeg encoding", data[i]);
				var ffmpeg = this.factory.createFfmpegProcess();
				ffmpeg.setCommand(command.parse(data[i].input));
				processes.push([Crypto.randomBytes(24).toString('hex'), ffmpeg]);

				if(data[i].input.includes(webm_manifest)) {
					var webm = this.factory.createWebmMetaProcess();
					webm.setCommand(ffmpeg.command[ffmpeg.command.length - 1]);
					processes.push([Crypto.randomBytes(24).toString('hex'), webm]);
				}
			break;
			default:
				throw new Error(`EncoderManager: ${command.codec} is not supported process.`);
			break;
		}
	}

	return processes;
};

EncoderManager.prototype.encode = function(operations) {
	log.debug("EncodingManager.encode", encoding);
	var promise;

	if(Array.isArray(operations)) {
		processes = processes ? processes.concat(operations) : operations;
	} else {
		throw new Error(`EncodingManager.encode: ${operations} must be of type array.`);
	}

	if(!encoding) {
		encoding = true;
		this.emit('processed');

		promise = new Promise(function(resolve, reject) {
			this.once('finished', resolve);
			this.once('error', reject);
		}.bind(this));
	} else {
		promise = new Promise.resolve(function() { return 'Queued encoding processes.'; });
	}

	this.emit('encodingList', format(processes.slice()));
	return promise;
};

EncoderManager.prototype.cancelEncode = function(id) {
	if(proccess.get(id)) {
		proccess.delete(id);
	} else if(current && current[0] === id) {
		if(current[1].cancel) {
			current[1].cancel();
		}
	}

	return format(processes.slice());
};

module.exports = EncoderManager;

function processedEvent() {
	this.on('processed', Promise.coroutine(function* (oldProcess) {
		if(processes.length > 0) {
			var encodeProcess = processes.shift();
			current = encodeProcess;
			attachEvents.call(this, encodeProcess[1]);
			yield encodeProcess[1].execute().catch(log.error);
		} else {
			this.emit('finished', 'All files encoded.');
			encoding = false;
		}

		if(oldProcess) {
			oldProcess.removeAllListeners('processed');
		}
	}.bind(this)));
}

function attachEvents(encodeProcess) {
	encodeProcess.on('start', function() {
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

		removeEvents(encodeProcess);
		this.emit('processed', encodeProcess);
	}.bind(this)).on('error', function(err) {
		log.error('There was an error encoding: ', err);
		log.socket('There was an error encoding: ', err);
	}.bind(this));
}

function format(entries) {
	var formatted = [];
	entries.forEach((data) => {
		formatted.push([data[0], data[1].getCommand()]);
	});

	return formatted;
}

function removeEvents(encodeProcess) {
	encodeProcess.removeAllListeners("start");
	encodeProcess.removeAllListeners("data");
	encodeProcess.removeAllListeners("exit");
	encodeProcess.removeAllListeners("error");
}
