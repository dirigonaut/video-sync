var log  = require('loglevel');

var logLevel  = 0;
var socket    = null;

function Logger(adminSocket) {
  socket = adminSocket;
}

Logger.trace = function(message) {
  console.log(message);
  //log.trace(message);
  pingLog(Logger.Enum.TRACE, message);
};

Logger.debug = function(message) {
  console.log(message);
  log.debug(message);
  pingLog(Logger.Enum.DEBUG, message);
};

Logger.info = function(message) {
  console.log(message);
  log.info(message);
  pingLog(Logger.Enum.INFO, message);
};

Logger.warn = function(message) {
  console.log(message);
  log.warn(message);
  pingLog(Logger.Enum.WARN, message);
};

Logger.error = function(message) {
  console.log(message);
  log.error(message);
  pingLog(Logger.Enum.ERROR, message);
};

Logger.setLevel = function(level) {
  log.setLevel(level);
  logLevel = level;
};

module.exports = Logger;

Logger.Enum = {"TRACE" : 0, "DEBUG" : 1, "INFO" : 2, "WARN" : 3, "ERROR" : 4};

var pingLog = function(level, text) {
  if(level >= logLevel && socket !== null && socket !== undefined) {
    var message = new Object();
    message.from = 'system';

    if(text !== null && typeof text === 'object') {
      message.text = JSON.stringify(text);
    } else {
      message.text = text;
    }

    socket.emit("chat-log-resp", message);
  }
};
