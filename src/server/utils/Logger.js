var log           = require('loglevel');

var PlayerManager = require('../state/player/PlayerManager');
var ChatEngine    = require('../chat/ChatEngine');
var Session       = require('../utils/Session');

var session     = new Session();
var chatEngine  = new ChatEngine();

const SYSTEM  = "system";

var logLevel  = 0;
var socket    = null;

function Logger() {
  if(socket == null) {
    setAdminSocket();
  }
}

Logger.prototype.trace = function(message) {
  log.trace(message);
  pingLog(Logger.Enum.TRACE, message);
};

Logger.prototype.debug = function(message) {
  log.debug(message);
  pingLog(Logger.Enum.DEBUG, message);
};

Logger.prototype.info = function(message) {
  log.info(message);
  pingLog(Logger.Enum.INFO, message);
};

Logger.prototype.warn = function(message) {
  log.warn(message);
  pingLog(Logger.Enum.WARN, message);
};

Logger.prototype.error = function(message) {
  log.error(message);
  pingLog(Logger.Enum.ERROR, message);
};

Logger.prototype.setLevel = function(level) {
  log.setDefaultLevel(level);
  logLevel = level;
};

module.exports = Logger;

Logger.Enum = {"TRACE" : 0, "DEBUG" : 1, "INFO" : 2, "WARN" : 3, "ERROR" : 4};

var setAdminSocket = function() {
  var id = session.getAdmin();

  if(id != null) {
    var playerManager = new PlayerManager();
    socket = playerManager.getPlayer(id);
  }
};

var pingLog = function(level, message) {
  if(level >= logLevel) {
    chatEngine.ping(SYSTEM, socket, message);
  }
};
