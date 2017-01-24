var Winston = require('winston');

var Socket = require('./Socket');

function LogFactory() {

}

LogFactory.prototype.buildFileTransport = function(path, level, label, handleExceptions) {
  var fileTransport = new (Winston.transports.File) ({
    filename: path,
    maxsize: 100000,
    maxFiles: 3,
    level: level,
    showLevel:  true,
    label: label,
    silent: false,
    handleExceptions: handleExceptions,
    humanReadableUnhandledException: true,
    timestamp: function() {
      return new Date().toTimeString();
    }
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
