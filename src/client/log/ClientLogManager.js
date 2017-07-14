var Winston = require('winston');

var clientLog;

function ClientLogManager() {
}

ClientLogManager.prototype.initialize = function(force) {
  if(force === undefined ? typeof ClientLogManager.prototype.stateInit === 'undefined' : force) {
    ClientLogManager.prototype.stateInit = true;
    schemaFactory   = this.factory.createSchemaFactory();
  }

  if(typeof ClientLogManager.prototype.protoInit === 'undefined') {
    ClientLogManager.prototype.protoInit = true;
    var keys = Object.keys(ClientLogManager.LogEnum);

    log = Winston.loggers.get(ClientLogManager.LogEnum.GENERAL);
    ClientLogManager.prototype.LogEnum = ClientLogManager.LogEnum;
  }
};

ClientLogManager.prototype.addUILogging = function(callback) {
  var keys = Object.keys(ClientLogManager.LogEnum);

  for(var i in keys) {
    var uiTransport   = buildUITransport.call(this, ClientLogManager.LogEnum[keys[i]], 'debug', true, callback);
    var container     = Winston.loggers.get(ClientLogManager.LogEnum[keys[i]]);

    container.configure({
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

ClientLogManager.LogEnum = { FACTORY: 'factory', GENERAL: 'general', SOCKET: 'socket', VIDEO: 'video'};

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
    if(options.level === 'info') {
      callback(json);
    }

    console.log(json);
  }.bind(this);
}
