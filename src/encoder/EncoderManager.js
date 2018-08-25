const Promise = require('bluebird');
const Events  = require('events');

var plan, eventKeys, config, log;

function EncoderManager() { }

EncoderManager.prototype.initialize = function() {
	if(typeof EncoderManager.prototype.protoInit === 'undefined') {
    EncoderManager.prototype.protoInit = true;
		Object.setPrototypeOf(EncoderManager.prototype, Events.prototype);
		config      		= this.factory.createConfig();

		eventKeys       = this.factory.createKeys();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);

		processedEvent.call(this);
  }
};

EncoderManager.prototype.encode = function(encodingPlan) {
	log.debug("EncodingManager.encode");
	if(plan === undefined) {
		plan = encodingPlan;
		this.emit('processed');
	}
};

EncoderManager.prototype.getPlan = function() {
	return plan;
};

module.exports = EncoderManager;

function processedEvent() {
	this.on('processed', function () {
		if(plan.processes.length > 0) {
			var encodeProcess = plan.processes.shift();
			attachEvents.call(this, encodeProcess[1]);

			try {
				encodeProcess[1].execute();
			} catch (error) {
				log.error(error);
				this.emit('processed');
			}
		} else {
			this.emit('finished', plan);
			plan = undefined;
		}
	}.bind(this));
}

function attachEvents(encodeProcess) {
	encodeProcess.on('start', function(pid) {
		plan.statuses.set(pid, { "command": encodeProcess });
	}).on('data', function(pid, cur, dur) {
		if(cur) {
			plan.statuses[pid].encodedTo = cur;
		}

		if(dur) {
			plan.statuses[pid].duration = dur;
		}
	}).on('exit', function(pid, exitCode) {
		plan.statuses[pid].exitCode = exitCode;
		removeEvents(encodeProcess);
		this.emit('processed');
	}.bind(this)).on('error', function(pid, error) {
		if(!plan.statuses[pid].errors) {
			plan.statuses[pid].errors = [];
		}

		plan.statuses[pid].errors.push(error);
	});
}

function removeEvents(encodeProcess) {
	encodeProcess.removeAllListeners("start");
	encodeProcess.removeAllListeners("data");
	encodeProcess.removeAllListeners("exit");
	encodeProcess.removeAllListeners("error");
}
