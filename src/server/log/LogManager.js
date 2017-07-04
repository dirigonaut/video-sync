const Promise    = require('bluebird');
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
    var keys = Object.keys(LogManager.LogEnum);
    for(var i in keys) {
      Winston.loggers.get(LogManager.LogEnum[keys[i]]);
    }

    log = Winston.loggers.get(LogManager.LogEnum.LOG);

    LogManager.prototype.LogEnum = LogManager.LogEnum;
  }

  if(force === undefined ? typeof LogManager.prototype.stateInit === 'undefined' : force) {
    LogManager.prototype.stateInit = true;
    config = this.factory.createConfig();
  }
};

LogManager.prototype.addFileLogging = function() {
  log.debug('LogManager.addFileLogging');

  var keys = Object.keys(LogManager.LogEnum);
  for(var i in keys) {
    var fileTransport = buildFileTransport.call(this, Path.join(config.getLogDir(), FILE_NAME), LogManager.LogEnum[keys[i]], LevelEnum[keys[i]], false);
    var container = Winston.loggers.get(LogManager.LogEnum[keys[i]]);

    container.configure({
      levels: LogManager.Levels,
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

module.exports = LogManager;

LogManager.Levels   = { socket: 0, error: 1, warn: 2, info: 3, verbose: 4, debug: 5, silly: 6 };
LogManager.LogEnum  = { GENERAL: 'general', ADMINISTRATION: 'administration', AUTHENTICATION: 'authentication',
                        CHAT: 'chat', DATABASE: 'database', LOG: 'log', VIDEO: 'video', ENCODING: 'encoding', STATE: 'state', UTILS: "utils"};

var LevelEnum       = { GENERAL: 'info', ADMINISTRATION: 'info', AUTHENTICATION: 'info',
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
    formatter: createFormatter.call(this, label),
    timestamp: function() {
      return new Date().toTimeString();
    }
  });

  return fileTransport;
};

function createFormatter(label) {
  var session, redisSocket;

  return function(options) {
    var logMessage = {
      timestamp: options.timestamp(),
      level: options.level,
      label: label,
      message: options.message ? options.message : ''
    };

    if(options.meta && Object.keys(options.meta).length) {
      logMessage.meta = Util.inspect(options.meta, { showHidden: false, depth: 1 });
    }

    var json = JSON.stringify(logMessage);
    if(LogManager.Levels[options.level] === LogManager.Levels.socket) {
      if(!session) {
        session = this.factory.createSession();
      }

      if(!redisSocket) {
        redisSocket = this.factory.createRedisSocket();
      }

      session.getAdmin().then(function(ids) {
        if(ids) {
          redisSocket.ping(ids, 'chat-log-resp', logMessage);
        }
      });
    }

    return json;
  }.bind(this);
}
