var Winston = require('winston');

var NeDatabase = require('../database/NeDatabase');
var LogFactory = require('./LogFactory');
var PlayerManager = require('../player/PlayerManager');

var playerManager = new PlayerManager();

const FILE_NAME = 'logs.txt';

function LogManager() {

}

LogManager.prototype.addFileLogging = function(basePath) {
  var logFactory = new LogFactory();

  var fileTransport = logFactory.buildFileTransport(`${basePath}/${FILE_NAME}`, 'info', 'file-logger');

  for(var i in LogManager.LogEnum) {
    Winston.loggers.add(i, logFactory.buildContainer(i, false, fileTransport));
  }
};

LogManager.prototype.addSocketLogging = function(id) {
  var player = playerManager.getPlayer(id);

  var setupLogger = function(options) {
    var logFactory = new LogFactory();

    for(var i in LogManager.LogEnum) {
      var level = options[i] ? options[i].level : null;
      var exitOnError = options[i] ? options[i].exitOnError : null;

      var socketTransport = logFactory.buildSocketTransport(player.socket, level || 'info', Object.keys(LogManager.LogEnum)[i]);

      var container = Winston.loggers.get(id);
      container.exitOnError = exitOnError || false;
      container.options.transports.push(socketTransport);
    }
  }

  if(player !== null && player !== undefined) {
    loadOptions(setupLogger);
  }
};

LogManager.prototype.changeLog = function(id, level) {
  var container = Winston.loggers.get(id);
  container.options.transports[1].level = level;
};

module.exports = LogManager;

LogManager.LogEnum = { GENERAL: 0, ADMINISTRATION: 1, AUTHENTICATION: 2, CHAT: 3, DATABASE: 4, LOG: 5, VIDEO: 6, ENCODING: 7 };

function loadOptions(callback) {
  var database = new NeDatabase();
  database.readLogOptions(callback);
}
