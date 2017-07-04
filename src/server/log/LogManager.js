const Cluster    = require('cluster');
const Path       = require('path');
const Util       = require('util');
const Winston    = require('winston');

var config, log;

const LOG_LEVEL = "debug";
const TYPE      = Cluster.isMaster ? "masterProcess" : process.env.processType;
const FILE_NAME = `${TYPE}_${process.pid}_logs.txt`;
const EXCEPTION = `${TYPE}_${process.pid}_exception.txt`;

function LogManager() { }

LogManager.prototype.initialize = function(force) {
  if(typeof LogManager.prototype.protoInit === 'undefined') {
    LogManager.prototype.protoInit = true;

    config = this.factory.createConfig();

    var keys = Object.keys(LogManager.LogEnum);
    for(var i in keys) {
      Winston.loggers.get(LogManager.LogEnum[keys[i]]);
    }

    log = Winston.loggers.get(LogManager.LogEnum.LOG);

    LogManager.prototype.LogEnum = LogManager.LogEnum;
  }
};

LogManager.prototype.addFileLogging = function() {
  log.debug('LogManager.addFileLogging');

  var keys = Object.keys(LogManager.LogEnum);
  for(var i in keys) {
    var fileTransport = buildFileTransport(Path.join(config.getLogDir(), FILE_NAME), LogManager.LogEnum[keys[i]], LevelEnum[keys[i]], false);
    var container = Winston.loggers.get(LogManager.LogEnum[keys[i]]);

    container.configure({
      transports: [fileTransport]
    });
  }

  var exceptionTransport = buildFileTransport(Path.join(config.getLogDir(), EXCEPTION), 'exception', 'error', true);
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

var LevelEnum = { GENERAL: 'info', ADMINISTRATION: 'info', AUTHENTICATION: 'info',
                        CHAT: 'info', DATABASE: 'info', LOG: 'info', VIDEO: 'info', ENCODING: 'silly', STATE: 'info', UTILS: "info"};

var buildFileTransport = function(path, label, level, handleExceptions) {
  var fileTransport = new (Winston.transports.File) ({
    filename: path,
    maxsize: 100000,
    maxFiles: 3,
    level: level,
    lable: label,
    handleExceptions: handleExceptions,
    humanReadableUnhandledException: true,
    json: false,
    formatter: function(options) {
      var logMessage = {
        timestamp: options.timestamp(),
        level: options.level,
        label: label,
        message: options.message ? options.message : ''
      };

      if(options.meta && Object.keys(options.meta).length) {
        logMessage.meta = Util.inspect(options.meta, { showHidden: false, depth: 1 });
      }

      return JSON.stringify(logMessage);
    },
    timestamp: function() {
      return new Date().toTimeString();
    }
  });

  return fileTransport;
};
