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
	var pointer = 0;

	this.on('processed', function () {
		if(plan && plan.processes.hasOwnProperty(pointer)) {
			var encodeProcess = plan.processes[pointer];
			attachEvents.apply(this, encodeProcess);
			++pointer;

			encodeProcess[1].execute()
			.catch(function(error) {
				log.error(error);
				this.emit('processed');
			}.bind(this));
		} else if(pointer >= plan.processes.length) {
			this.emit('finished', plan);
			plan = undefined;
		}
	}.bind(this));
}

function attachEvents(id, encodeProcess) {
	encodeProcess.on('start', function(pid) {
		plan.statuses[id] = {};
	}).on('data', function(cur, dur) {
		if(cur) {
			plan.statuses[id].encodedTo = cur;
		}

		if(dur) {
			plan.statuses[id].duration = dur;
		}
	}).on('exit', function(exitCode) {
		plan.statuses[id].exitCode = exitCode;
		removeEvents(encodeProcess);
		this.emit('processed');
	}.bind(this)).on('error', function(error) {
		if(!plan.statuses[id].errors) {
			plan.statuses[id].errors = [];
		}

		plan.statuses[id].errors.push(error);
	});
}

function removeEvents(encodeProcess) {
	encodeProcess.removeAllListeners("start");
	encodeProcess.removeAllListeners("data");
	encodeProcess.removeAllListeners("exit");
	encodeProcess.removeAllListeners("error");
}
