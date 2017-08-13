const Promise    = require('bluebird');
const Cluster    = require('cluster');
const Path       = require('path');
const Util       = require('util');
const Winston    = require('winston');

var config, schemaFactory, log;

const LOG_LEVEL = "debug";
const TYPE      = Cluster.isMaster ? "masterProcess" : process.env.processType;
const FILE_NAME = `${TYPE}_${process.pid}_logs.txt`;
const EXCEPTION = `${TYPE}_${process.pid}_exception.txt`;

function LogManager() { }

LogManager.prototype.initialize = function(force) {
  if(force === undefined ? typeof LogManager.prototype.stateInit === 'undefined' : force) {
    LogManager.prototype.stateInit = true;
    config          = this.factory.createConfig(false);
    schemaFactory   = this.factory.createSchemaFactory();
  }

  if(typeof LogManager.prototype.protoInit === 'undefined') {
    LogManager.prototype.protoInit = true;
    var keys = Object.keys(LogManager.LogEnum);
    log = Winston.loggers.get(LogManager.LogEnum.LOG);
    LogManager.prototype.LogEnum = LogManager.LogEnum;
  }
};

LogManager.prototype.addFileLogging = function() {
  var keys = Object.keys(LogManager.LogEnum);
  var logLevels = typeof config.getConfig().logLevels !== 'undefined' ? config.getConfig().logLevels : LevelEnum;

  for(var i in keys) {
    var fileTransport = buildFileTransport.call(this, Path.join(config.getLogDir(), FILE_NAME),
                          LogManager.LogEnum[keys[i]], logLevels[keys[i]], false);
    var container     = Winston.loggers.get(LogManager.LogEnum[keys[i]]);

    container.configure({
      levels: LogManager.Levels,
      transports: [fileTransport]
    });
  }

  var exceptionTransport = buildFileTransport(Path.join(config.getLogDir(), EXCEPTION), 'exception', 'error', true);
  Winston.loggers.add(EXCEPTION, { transports: [exceptionTransport] });
  Winston.loggers.get(EXCEPTION).exitOnError = false;

  log.debug('LogManager.addFileLogging');
  log.info('Attached file logging.');
};

LogManager.prototype.getLog = function(id) {
  return Winston.loggers.get(id);
};

module.exports = LogManager;

LogManager.Levels   = { socket: 0, error: 1, warn: 2, info: 3, verbose: 4, debug: 5, silly: 6 };
LogManager.LogEnum  = { GENERAL: 'general', ADMINISTRATION: 'administration', AUTHENTICATION: 'authentication',
                        CHAT: 'chat', DATABASE: 'database', LOG: 'log', VIDEO: 'video', ENCODING: 'encoding', STATE: 'state', UTILS: "utils"};

var LevelEnum       = { GENERAL: 'debug', ADMINISTRATION: 'debug', AUTHENTICATION: 'debug',
                        CHAT: 'debug', DATABASE: 'debug', LOG: 'debug', VIDEO: 'debug', ENCODING: 'debug', STATE: 'debug', UTILS: "debug"};

var buildFileTransport = function(path, label, level, handleExceptions) {
  var fileTransport = new (Winston.transports.File) ({
    filename: path,
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
      time: options.timestamp(),
      level: options.level,
      label: label,
      text: options.message ? options.message : ''
    };

    if(options.meta && Object.keys(options.meta).length) {
      logMessage.meta = Util.inspect(options.meta, { showHidden: false, depth: 2 });
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
          var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.LOGRESPONSE,
            [logMessage.time, 'server', logMessage.label, logMessage.text, logMessage.meta]);
          redisSocket.ping(ids, 'chat-log-resp', response);
        }
      });
    }

    return json;
  }.bind(this);
}
