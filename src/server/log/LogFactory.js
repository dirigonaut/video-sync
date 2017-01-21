var Winston = require('winston');

function LogFactory() {

}

LogFactory.prototype.buildContainer = function(id, exitOnError, fileTransport) {
  var container = new Winston.Container();

  container.add(id, {
    file: fileTransport,
    //exitOnError: exitOnError
  });

  return container;
};

LogFactory.prototype.buildFormatter = function() {
  return function(options) {
    // Return string will be passed to logger.
    return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (options.message ? options.message : '') +
      (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
  }
};

LogFactory.prototype.buildFileTransport = function(path, level, label) {
  var fileTransport = new (Winston.transports.File)({
    filename: path,
    level: level,
    showLevel:  true,
    label: label,
    silent: false,
    handleExceptions: true,
    humanReadableUnhandledException: true,
    timestamp: function() {
      return Date.now();
    },
    formatter: this.buildFormatter()
  });

  return fileTransport;
};

LogFactory.prototype.buildSocketTransport = function(socket, level, label) {
  var socketTransport = new (Winston.transports.SocketTransport)({
    socket: socket,
    level: level,
    showLevel:  true,
    label: label,
    silent: false,
    handleExceptions: true,
    humanReadableUnhandledException: true,
    timestamp: function() {
      return Date.now();
    },
    formatter: this.buildFormatter()
  });

  return socketTransport;
};

module.exports = LogFactory;
