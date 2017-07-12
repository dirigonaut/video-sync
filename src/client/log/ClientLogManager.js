var Winston = require('winston');

var ClientTransport = require('./ClientTransport');

var clientLog = null;

function ClientLogManager() {
}

ClientLogManager.prototype.initialize = function(force) {
  if(force === undefined ? typeof ClientLogManager.prototype.stateInit === 'undefined' : force) {
    ClientLogManager.prototype.stateInit = true;
    config          = this.factory.createConfig(false);
    schemaFactory   = this.factory.createSchemaFactory();
  }

  if(typeof ClientLogManager.prototype.protoInit === 'undefined') {
    ClientLogManager.prototype.protoInit = true;
    var keys = Object.keys(ClientLogManager.LogEnum);
    log = Winston.loggers.get(ClientLogManager.LogEnum.LOG);
    ClientLogManager.prototype.LogEnum = LogManager.LogEnum;
  }
};

ClientLogManager.prototype.addGUILogging = function(callback) {
  var keys = Object.keys(ClientLogManager.LogEnum);
  var logLevels = typeof config.getConfig().logLevels !== 'undefined' ? config.getConfig().logLevels : LevelEnum;

  for(var i in keys) {
    var uiTransport   = buildUITransport.call(this, Path.join(config.getLogDir(), FILE_NAME),
                          ClientLogManager.LogEnum[keys[i]], logLevels[keys[i]], false);
    var container     = Winston.loggers.get(ClientLogManager.LogEnum[keys[i]]);

    container.configure({
      levels: LogManager.Levels,
      transports: [uiTransport]
    });
  }

  log.debug('LogManager.addFileLogging');
  log.info('Attached file logging.');
};

ClientLogManager.prototype.getLog = function(id) {
  return Winston.loggers.get(id);
};

module.exports = ClientLogManager;

ClientLogManager.LogEnum = { FACTORY: 'factory', SOCKET: 'socket', UTILS: 'utils', VIDEO: 'video'};

var buildUITransport = function(label, level, enableConsoleLogging, callback) {
  var uiTransport = new (Winston.transports.Console) ({
    level: level,
    lable: label,
    silent: enableConsoleLogging,
    handleExceptions: true,
    json: false,
    humanReadableUnhandledException: true,
    formatter: createFormatter.call(this, label, callback),
    timestamp: function() {
      return new Date().toTimeString();
    }
  });

  return uiTransport;
};

function createFormatter(label, callback) {
  return function(options) {
    var logMessage = {
      time: options.timestamp(),
      level: options.level,
      label: label,
      text: options.message ? options.message : ''
    };

    if(options.meta && Object.keys(options.meta).length) {
      logMessage.meta = Util.inspect(options.meta, { showHidden: false, depth: 1 });
    }

    var json = JSON.stringify(logMessage);
    if(ClientLogManager.Levels[options.level] === ClientLogManager.Levels.socket) {
      callback(json);
    }

    return json;
  }.bind(this);
}
