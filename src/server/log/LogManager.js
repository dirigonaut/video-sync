var Winston = require('winston');

var LogFactory = require('./LogFactory');

var log = null;

const FILE_NAME = "logs.txt";
const EXCEPTION = "exception";

function LogManager() {
}

LogManager.prototype.addFileLogging = function(basePath) {
  var logFactory = new LogFactory();

  var fileTransport = logFactory.buildFileTransport(`${basePath}/${FILE_NAME}`, 'info', 'file-logger', false);

  var keys = Object.keys(LogManager.LogEnum);
  for(var i in keys) {
    Winston.loggers.add(LogManager.LogEnum[keys[i]], { transports: [fileTransport] });
  }

  var exceptionTransport = logFactory.buildFileTransport(`${basePath}/${FILE_NAME}`, 'error', 'exception-logger', true);
  Winston.loggers.add(EXCEPTION, { transports: [exceptionTransport] });
  Winston.loggers.get(EXCEPTION).exitOnError = false;

  log = Winston.loggers.get(LogManager.LogEnum.LOG);
};

LogManager.prototype.addSocketLogging = function(socket) {
  log.info("attaching socket logging");
  var logFactory = new LogFactory();

  var keys = Object.keys(LogManager.LogEnum);
  for(var i in keys) {
    var socketTransport = logFactory.buildSocketTransport(socket, 'info', LogManager.LogEnum[keys[i]], false);
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
};

LogManager.prototype.changeLog = function(id, level) {
  log.info(`Change log: ${id} to level: ${level}`);
  var container = Winston.loggers.get(id);
  container.transports.socket.level = level;
};

module.exports = LogManager;

LogManager.LogEnum = { GENERAL: 'general', ADMINISTRATION: 'administration', AUTHENTICATION: 'authentication',
                        CHAT: 'chat', DATABASE: 'database', LOG: 'log', VIDEO: 'video', ENCODING: 'encoding' };
