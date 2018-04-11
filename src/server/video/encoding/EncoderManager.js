const Promise = require('bluebird');
const Events  = require('events');
const Crypto  = require('crypto');

const webm_manifest = "webm_dash_manifest";
const mp4_manifest = "-frag-rap";

var command, encoding, processes, current, credentials, redisSocket, eventKeys, config, log;

function EncoderManager() { }

EncoderManager.prototype.initialize = function() {
	if(typeof EncoderManager.prototype.protoInit === 'undefined') {
    EncoderManager.prototype.protoInit = true;
		Object.setPrototypeOf(EncoderManager.prototype, Events.prototype);
		config      		= this.factory.createConfig();

		encoding				= false;
		processes 			= [];

		credentials 		= this.factory.createCredentialManager();
		redisSocket 		= this.factory.createRedisSocket();
		command			    = this.factory.createCommand();

		eventKeys       = this.factory.createKeys();
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
				ffmpeg.setCommand(command.parse(data[i].input, config.getConfig().videoSyncInfo.mediaDir));
				processes.push([Crypto.randomBytes(24).toString('hex'), ffmpeg]);
				console.log(ffmpeg)
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

	this.getEncodings();
	return promise;
};

EncoderManager.prototype.getEncodings = function() {
	var allProcesses = processes.slice();
	allProcesses.unshift(current);

	this.emit('encodingList', format(allProcesses));
};

EncoderManager.prototype.cancelEncode = function(id) {
	var deleted;
	processes.forEach((value, index, array) => {
		if(value.includes(id)) {
			deleted = array.splice(index, 1);
		}
	});

	if(!deleted && current && current[0] === id) {
		if(current[1].cancel) {
			current[1].cancel();
		}
	}
};

module.exports = EncoderManager;

function processedEvent() {
	this.on('processed', Promise.coroutine(function* (oldProcess) {
		if(processes.length > 0) {
			var encodeProcess = processes.shift();
			current = encodeProcess;
			attachEvents.call(this, encodeProcess[1]);
			yield encodeProcess[1].execute().catch(function(error) {
				log.socket(error);
				log.error(error);

				uiLog(current[0], 'error', `Server: Failed with error:`, error);
				this.emit('processed');
			}.bind(this));
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
		log.debug('Server: Start encoding: ' + new Date().toTimeString());
		uiLog(current[0], 'info', 'Server: Start encoding');
	}).on('data', function(percent) {
		uiLog(current[0], 'info', percent);
	}).on('exit', function(exitCode) {
		if(!exitCode) {
			log.info('Server: Succesfully converted file.' + new Date().toTimeString());
			uiLog(current[0], 'info', 'Server: Succesfully converted file.');
		} else {
			log.info(`Server: Encoding returned error code: ${exitCode}, ` + new Date().toTimeString());
			uiLog(current[0], 'error', `Server: Encoding returned error code: ${exitCode}`);
		}

		removeEvents(encodeProcess);
		this.emit('processed', encodeProcess);
	}.bind(this)).on('error', function(err) {
		log.info(`Server: Encoding emitted error: , ` + new Date().toTimeString(), err);
		uiLog(current[0], 'error', `Server: Encoding emitted error:`, err);
	}.bind(this));
}

var uiLog = Promise.coroutine(function* (id, level, data) {
	var admin = yield credentials.getAdmin();
	var payload = {
		time: new Date().toTimeString(),
		level: level,
		label: id,
		data: data
	};

	if(admin) {
		redisSocket.ping.call(EncoderManager.prototype, admin.id, eventKeys.ENCODELOG, payload);
	}
});

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
