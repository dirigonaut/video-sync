var Winston = require('winston');

var SocketTransport = require('./SocketTransport');


function LogFactory() {

}

LogFactory.prototype.buildContainer = function(id, level, handleExceptions, exitOnError, transports) {
  var container = new Winston.Container();

  container.add(id, {
    console: {
      level: level,
      handleExceptions: handleExceptions,
      json: true
    },
    transports,
    exitOnError: exitOnError
  });

  return container;
};

LogFactory.prototype.buildFileTransport = function(path) {
  var fileTransport = new (winston.transports.File)({
    filename: path,
    timestamp: function() {
      return Date.now();
    },
    formatter: function(options) {
      // Return string will be passed to logger.
      return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (options.message ? options.message : '') +
        (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
    }
  });

  return fileTransport;
};

LogFactory.prototype.buildSocketTransport = function(socket) {
  var socketTransport = new SocketTransport(socket);
  return socketTransport;
};

module.exports = LogFactory;
