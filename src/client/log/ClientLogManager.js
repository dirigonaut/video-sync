var Winston = require('winston');

var ClientTransport = require('./ClientTransport');

var clientLog = null;

function ClientLogManager() {
}

ClientLogManager.prototype.addGUILogging = function(logName, callback) {
  var clientTransport = buildClientTransport(callback, 'info', logName, false);
  Winston.loggers.add(logName, { transports: [clientTransport] });

  clientLog = Winston.loggers.get(logName);
  clientLog.info("Client logging attached");
};

module.exports = ClientLogManager;

ClientLogManager.LogEnum = { CLIENT: 'client'};

function buildClientTransport(callback, level, label, handleExceptions) {
  var clientTransport = new ClientTransport({
    callback: callback,
    level: level,
    showLevel:  true,
    label: label,
    silent: false,
    handleExceptions: handleExceptions,
  });

  return clientTransport;
};
