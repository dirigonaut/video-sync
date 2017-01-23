var Winston = require('winston');

var Socket = require('./Socket');

function LogFactory() {

}

LogFactory.prototype.buildFormatter = function() {
  return function(options) {
    // Return string will be passed to logger.
    return options.timestamp() +' '+ options.level.toUpperCase() +' '+ (options.message ? options.message : '') +
      (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
  }
};

LogFactory.prototype.buildFileTransport = function(path, level, label, handleExceptions) {
  var fileTransport = new (Winston.transports.File) ({
    filename: path,
    level: level,
    showLevel:  true,
    label: label,
    silent: false,
    handleExceptions: handleExceptions,
    timestamp: function() {
      return Date.now();
    },
    formatter: this.buildFormatter()
  });

  return fileTransport;
};

LogFactory.prototype.buildSocketTransport = function(socket, level, label, handleExceptions) {
  var socket = new Socket({
    socket: socket,
    level: level,
    showLevel:  true,
    label: label,
    silent: false,
    handleExceptions: handleExceptions,
  });

  return socket;
};

module.exports = LogFactory;
