var Session = require('../utils/Session');
var PlayerManager = require('../state/player/PlayerManager');

var session = new Session();

var logLevel = 2;
var socket = null;

function Logger() {

}

Logger.prototype.log = function(level, message) {

};

Logger.prototype.setLevel = function(level) {
  logLevel = level;
};

Logger.prototype._setSocket = function() {

};

module.exports = Logger;

Logger.Enum = {"DEBUG" : 0, "TRACE" : 1, "INFO" : 2, "WARN" : 3, "ERROR" : 4};
