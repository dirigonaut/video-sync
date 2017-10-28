const Util = require('util');

var logs;

function ClientLogManager() { }

ClientLogManager.prototype.addUILogging = function(callback) {
  logs = [];

  var keys = Object.keys(ClientLogManager.Enum.Logs);
  for(var i of keys) {
    var logger = buildUILogger(ClientLogManager.Enum.Logs[i], 'debug', false, callback);
    logs[ClientLogManager.Enum.Logs[i]] = logger;
  }
};

ClientLogManager.prototype.getLog = function(id) {
  return logs[id];
};

module.exports = ClientLogManager;

ClientLogManager.Enum = {};
ClientLogManager.Enum.Logs = { FACTORY: 'factory', GENERAL: 'general', SOCKET: 'socket', VIDEO: 'video'};
ClientLogManager.Enum.Levels = { ui: 0, error: 1, warn: 2, info: 3, verbose: 4, debug: 5, silly: 6 };

var buildUILogger = function(label, level, enableConsoleLogging, callback) {
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
    silent: enableConsoleLogging,
    uiLog: callback,
    log: log
  });

  return uiLogger;
};

function log(level, message, meta) {
  var logMessage = {
    time: new Date().toTimeString(),
    level: level,
    label: this.label,
    text: message ? message : ''
  };

  if(meta) {
    logMessage.meta = JSON.stringify(meta, null, 2);
  }

  if(ClientLogManager.Enum.Levels[level] === ClientLogManager.Enum.Levels.ui) {
    this.uiLog(logMessage);
  }

  if(!this.silent && ClientLogManager.Enum.Levels[level] <= ClientLogManager.Enum.Levels[this.level]) {
    var logLevel = typeof console[level] !== 'undefined' ? level : 'trace';
    console[logLevel](logMessage);
  }
}
