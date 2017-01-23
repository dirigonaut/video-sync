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

  var fileTransport = logFactory.buildFileTransport(`${basePath}/${FILE_NAME}`, 'info', 'gen-file-logger', true);
  Winston.loggers.add('File_Logger', { transports: [fileTransport] });
};

LogManager.prototype.addSocketLogging = function(id) {
  var player = playerManager.getPlayer(id);

  var setupLogger = function(options) {
    console.log("attaching socket logging");
    var logFactory = new LogFactory();

    for(var i in LogManager.LogEnum) {
      var level = options[i] ? options[i].level : null;

      var socketTransport = logFactory.buildSocketTransport(player.socket, 'info', i, false);

      var container = Winston.loggers.get('File_Logger');
      var fileTransport = container.transports.file;
      var transports = [fileTransport, socketTransport];

      var container = Winston.loggers.get(i);
      container.configure({
        transports: transports,
      });

      Winston.loggers.get(i).error('testing');
    }
  }

  if(player !== null && player !== undefined) {
    console.log("query for options");
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
