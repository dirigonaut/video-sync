var Winston = require('winston');

var LogFactory = require('./LogFactory');

var log = null;

const LOG_LEVEL = "debug";
const FILE_NAME = "logs.txt";
const EXCEPTION = "exception";

function LogManager() {
}

LogManager.prototype.initialize = function() {
  var keys = Object.keys(LogManager.LogEnum);
  for(var i in keys) {
    Winston.loggers.get(LogManager.LogEnum[keys[i]]);
  }

  log = Winston.loggers.get(LogManager.LogEnum.LOG);
}

LogManager.prototype.addFileLogging = function(basePath) {
  console.log(basePath);
  log.debug('LogManager.addFileLogging', basePath);
  var logFactory = new LogFactory();

  var fileTransport = logFactory.buildFileTransport(`${basePath}/${FILE_NAME}`, LOG_LEVEL, 'file-logger', false);

  var keys = Object.keys(LogManager.LogEnum);
  for(var i in keys) {
    var container = Winston.loggers.get(LogManager.LogEnum[keys[i]]);

    container.configure({
      transports: [fileTransport]
    });
  }

  var exceptionTransport = logFactory.buildFileTransport(`${basePath}/${EXCEPTION}`, 'error', 'exception-logger', true);
  Winston.loggers.add(EXCEPTION, { transports: [exceptionTransport] });
  Winston.loggers.get(EXCEPTION).exitOnError = false;

  log.info('Attached file logging.');
};

LogManager.prototype.addSocketLogging = function(socket) {
  log.debug('LogManager.addSocketLogging');
  var logFactory = new LogFactory();

  var keys = Object.keys(LogManager.LogEnum);
  for(var i in keys) {
    var socketTransport = logFactory.buildSocketTransport(socket, LOG_LEVEL, LogManager.LogEnum[keys[i]], false);
    var container = Winston.loggers.get(LogManager.LogEnum[keys[i]]);
    var fileTransport = container.transports.file;
    var transports = [fileTransport, socketTransport];

    container.configure({
      transports: transports,
    });
  }

  var socketTransport = logFactory.buildSocketTransport(socket, 'error', EXCEPTION, false);
  var container = Winston.loggers.get(EXCEPTION);
  var fileTransport = container.transports.file;
  var transports = [fileTransport, socketTransport];

  container.configure({
    transports: transports,
  });

  log.info("Attached socket logging");
};

LogManager.prototype.changeLog = function(id, level) {
  log.info(`Change log: ${id} to level: ${level}`);
  var container = Winston.loggers.get(id);
  container.transports.socket.level = level;
};

LogManager.getLog = function(id) {
  return Winston.loggers.get(id);
};

module.exports = LogManager;

LogManager.LogEnum = { GENERAL: 'general', ADMINISTRATION: 'administration', AUTHENTICATION: 'authentication',
                        CHAT: 'chat', DATABASE: 'database', LOG: 'log', VIDEO: 'video', ENCODING: 'encoding', STATE: 'state', UTILS: "utils"};
