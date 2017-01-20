var Winston = require('winston');

var LogFactory = require('./LogFactory');

const FILE_NAME = 'logs.txt'

function LogManager() {

}

LogManager.prototype.initialize = function(options, socket, basePath) {
  var logFactory = new LogFactory();

  var transports = [];
  transports.push(logFactory.buildFileTransport(`${basePath}/${FILE_NAME}`));
  transports.push(logFactory.buildSocketTransport(socket));

  for(var i in LogManager.LogEnum) {
    winston.loggers.add(i, logFactory.buildContainer(i, options[i].level, options[i].handleExceptions, options[i].exitOnError, transports));
  }
};

LogManager.prototype.changeLog = function(id, options) {

};

module.exports = LogManager;

LogManager.LogEnum = { };
