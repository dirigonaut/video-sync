const Util    = require('util');
const Events  = require('events');

var emitter, eventKeys, logs;

function ClientLogManager() { }

ClientLogManager.prototype.initialize = function() {
	if(typeof ClientLogManager.prototype.protoInit === 'undefined') {
		ClientLogManager.prototype.protoInit 	= true;
		ClientLogManager.prototype.events 		= Object.create(Events.prototype);

    eventKeys = this.factory.createKeys();
	}
};

ClientLogManager.prototype.createLoggers = function() {
  logs = [];

  var keys = Object.keys(ClientLogManager.Enum.Logs);
  for(var i of keys) {
    var logger = buildUILogger(ClientLogManager.Enum.Logs[i], 'info');
    logs[ClientLogManager.Enum.Logs[i]] = logger;
  }
};

ClientLogManager.prototype.getLog = function(id) {
  return logs[id];
};

ClientLogManager.prototype.setLevel = function(id, level) {
  return logs[id].level = level;
};

module.exports = ClientLogManager;

ClientLogManager.Enum = {};
ClientLogManager.Enum.Logs = { FACTORY: 'factory', GENERAL: 'general', SOCKET: 'socket', VIDEO: 'video' };
ClientLogManager.Enum.Levels = { ui: 0, error: 1, warn: 2, info: 3, debug: 4 };

var buildUILogger = function(label, level) {
  var UiLogger = function() { };
  var uiLogger = Object.create(UiLogger.prototype);

  var keys = Object.keys(ClientLogManager.Enum.Levels);
  for(let i of keys) {
    UiLogger.prototype[i] = function(message, meta) {
      log.call(uiLogger, i, message, meta);
    }
  }

  uiLogger = Object.assign(uiLogger, {
    level: level,
    label: label,
    log: log
  });

  return uiLogger;
};

function log(level, message, meta) {
  var logMessage = {
    time: new Date().toTimeString(),
    level: level,
    label: this.label,
    data: message ? message : meta,
    meta: message && meta ? meta : ''
  };

  if(ClientLogManager.Enum.Levels[level] <= ClientLogManager.Enum.Levels[this.level]) {
    console.log(logMessage);
  }

  if(ClientLogManager.Enum.Levels[level] === ClientLogManager.Enum.Levels.ui) {
    ClientLogManager.prototype.events.emit(ClientLogManager.Enum.Levels.ui, logMessage);
  }
}
