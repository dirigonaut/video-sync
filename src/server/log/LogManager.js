const Cluster    = require('cluster');
const Path       = require('path');
const Winston    = require('winston');

var config, log;

const LOG_LEVEL = "debug";
const TYPE      = Cluster.isMaster ? "masterProcess" : process.env.processType;
const FILE_NAME = `${TYPE}_${process.pid}_logs.txt`;
const EXCEPTION = `${TYPE}_${process.pid}_exception.txt`;

function LogManager() { }

LogManager.prototype.initialize = function() {
  if(typeof LogManager.prototype.protoInit === 'undefined') {
    config = this.factory.createConfig();

    var keys = Object.keys(LogManager.LogEnum);
    for(var i in keys) {
      Winston.loggers.get(LogManager.LogEnum[keys[i]]);
    }

    log = Winston.loggers.get(LogManager.LogEnum.LOG);

    LogManager.prototype.LogEnum = LogManager.LogEnum;
    LogManager.prototype.protoInit = true;
  }
};

LogManager.prototype.addFileLogging = function() {
  log.debug('LogManager.addFileLogging');
  var fileTransport = buildFileTransport(Path.join(config.getLogDir(), FILE_NAME), LOG_LEVEL, 'file-logger', false);

  var keys = Object.keys(LogManager.LogEnum);
  for(var i in keys) {
    var container = Winston.loggers.get(LogManager.LogEnum[keys[i]]);

    container.configure({
      transports: [fileTransport]
    });
  }

  var exceptionTransport = buildFileTransport(Path.join(config.getLogDir(), EXCEPTION), 'error', 'exception-logger', true);
  Winston.loggers.add(EXCEPTION, { transports: [exceptionTransport] });
  Winston.loggers.get(EXCEPTION).exitOnError = false;

  log.info('Attached file logging.');
};

LogManager.prototype.getLog = function(id) {
  return Winston.loggers.get(id);
};

LogManager.getLog = function(id) {
  return Winston.loggers.get(id);
};

module.exports = LogManager;

LogManager.LogEnum = { GENERAL: 'general', ADMINISTRATION: 'administration', AUTHENTICATION: 'authentication',
                        CHAT: 'chat', DATABASE: 'database', LOG: 'log', VIDEO: 'video', ENCODING: 'encoding', STATE: 'state', UTILS: "utils"};

var buildFileTransport = function(path, level, label, handleExceptions) {
  var fileTransport = new (Winston.transports.File) ({
    filename: path,
    maxsize: 100000,
    maxFiles: 3,
    level: level,
    showLevel:  true,
    label: label,
    silent: false,
    handleExceptions: handleExceptions,
    humanReadableUnhandledException: true,
    timestamp: function() {
      return new Date().toTimeString();
    }
  });

  return fileTransport;
};
