const Promise    = require('bluebird');
const Cluster    = require('cluster');
const Path       = require('path');
const Winston    = require('winston');
const Fs         = require('fs');

var config, eventKeys, schemaFactory, log;

const LOG_LEVEL = "debug";
const TYPE      = Cluster.isMaster ? "masterProcess" : process.env.processType;
const FILE_NAME = `${TYPE}-${process.env.index ? process.env.index : 0}.txt`;

function LogManager() { }

LogManager.prototype.initialize = function() {
  if(typeof LogManager.prototype.protoInit === 'undefined') {
    config          = this.factory.createConfig();
    eventKeys       = this.factory.createKeys();

    if(config.isInit()) {
      LogManager.prototype.protoInit = true;
      schemaFactory   = this.factory.createSchemaFactory();
      log = Winston.loggers.get(LogManager.Enum.Logs.LOG);
    }
  }
};

LogManager.prototype.addFileLogging = function() {
  var keys = Object.keys(LogManager.Enum.Logs);
  var logLevels = config.getConfig().log ? config.getConfig().log : undefined;

  for(var i in keys) {
    var fileTransport = buildFileTransport.call(this, Path.join(config.getLogDir(), FILE_NAME),
                          LogManager.Enum.Logs[keys[i]], logLevels ? logLevels[keys[i]] : LogManager.Enum.Logs.error, true);
    var container     = Winston.loggers.get(LogManager.Enum.Logs[keys[i]]);

    fileTransport.exitOnError = false;

    container.configure({
      levels: LogManager.Enum.Levels,
      transports: [fileTransport]
    });
  }
};

LogManager.prototype.getLog = function(id) {
  return Winston.loggers.get(id);
};

module.exports = LogManager;

LogManager.Enum = {};
LogManager.Enum.Levels  = { socket: 0, error: 1, warn: 2, info: 3, verbose: 4, debug: 5, silly: 6 };
LogManager.Enum.Logs    = { GENERAL: 'general', ADMINISTRATION: 'administration', AUTHENTICATION: 'authentication',
                        CHAT: 'chat', DATABASE: 'database', LOG: 'log', VIDEO: 'video', ENCODING: 'encoding', STATE: 'state', UTILS: "utils"};

var buildFileTransport = function(path, label, level, handleExceptions) {
  var fileTransport = new (Winston.transports.File) ({
    filename: path,
    level: level,
    lable: label,
    maxsize: 10000000,
    maxFiles: 3,
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
  var credentials, redisSocket;

  return function(options) {
    var logMessage = {
      time: options.timestamp(),
      level: options.level,
      label: label,
      text: options.message ? options.message : ''
    };

    if(options.meta && Object.keys(options.meta).length) {
      logMessage.meta = JSON.stringify(options.meta, null, 2);
    }

    var json = JSON.stringify(logMessage);
    if(LogManager.Enum.Levels[options.level] === LogManager.Enum.Levels.socket) {
      if(!credentials) {
        credentials = this.factory.createCredentialManager();
      }

      if(!redisSocket) {
        redisSocket = this.factory.createRedisSocket();
      }

      credentials.getAdmin().then(function(admin) {
        if(admin && admin.id) {
          var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.LOGRESPONSE,
            [logMessage.time, 'server', logMessage.label, logMessage.text, logMessage.meta]);
          redisSocket.ping.call(this, admin.id, eventKeys.SERVERLOG, response);
        }
      });
    }

    return json;
  }.bind(this);
}
