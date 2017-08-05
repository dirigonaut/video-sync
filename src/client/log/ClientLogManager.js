const Util = require('util');

var logs;

function ClientLogManager() {
}

ClientLogManager.prototype.initialize = function(force) {
  if(typeof ClientLogManager.prototype.protoInit === 'undefined') {
    ClientLogManager.prototype.protoInit = true;
    ClientLogManager.prototype.LogEnum = ClientLogManager.LogEnum;
  }
};

ClientLogManager.prototype.addUILogging = function(callback) {
  logs = [];

  var keys = Object.keys(ClientLogManager.LogEnum);
  for(var i of keys) {
    var logger = buildUILogger(ClientLogManager.LogEnum[i], 'debug', false, callback);
    logs[ClientLogManager.LogEnum[i]] = logger;
  }
};

ClientLogManager.prototype.getLog = function(id) {
  return logs[id];
};

module.exports = ClientLogManager;

ClientLogManager.LogEnum = { FACTORY: 'factory', GENERAL: 'general', SOCKET: 'socket', VIDEO: 'video'};
ClientLogManager.LogLevel = { ui: 0, error: 1, warn: 2, info: 3, verbose: 4, debug: 5, silly: 6 };

var buildUILogger = function(label, level, enableConsoleLogging, callback) {
  var uiLogger = {
    level: level,
    label: label,
    silent: enableConsoleLogging,
    uiLog: callback,
    log: log
  };

  var keys = Object.keys(ClientLogManager.LogLevel);
  for(let i of keys) {
    uiLogger[i] = function(message, meta) {
       uiLogger.log.call(uiLogger, i, message, meta);
    }
  }

  return Object.create(uiLogger);
};

function log(level, message, meta) {
  var logMessage = {
    time: new Date().toTimeString(),
    level: level,
    label: this.label,
    text: message ? message : ''
  };

  if(meta) {
    logMessage.meta = Util.inspect(meta, { showHidden: false, depth: 1 });
  }

  if(ClientLogManager.LogLevel[level] === ClientLogManager.LogLevel.ui) {
    this.uiLog(logMessage);
  }

  if(!this.silent && ClientLogManager.LogLevel[level] <= ClientLogManager.LogLevel[this.level]) {
    var logLevel = typeof console[level] !== 'undefined' ? level : 'trace';
    console[logLevel](logMessage);
  }
}
