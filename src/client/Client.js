const Promise               = require('bluebird');
const ClientFactoryManager  = require('./factory/ClientFactoryManager');

var factory, log;

function Client() { }

Client.prototype.initialize = function(serverUrl, token) {
  var factory = this.getFactory();

  if(typeof Client.prototype.protoInit === 'undefined') {
    Client.prototype.protoInit = true;
    var logManager = factory.createClientLogManager();
    log = logManager.getLog(logManager.Enums.LOGS.GENERAL);
  }

  var clientSocket = factory.createClientSocket();

  return clientSocket.connectAsync(serverUrl, token)
  .then(function(response) {
    log.ui('Authenticated with server.');

    var isAdmin = response[1] ? true : false;
    var acknowledged = response[0] !== 'undefined' ? response[0] : undefined;

    return { 'acknowledge': acknowledged, 'isAdmin': isAdmin };
  });
};

Client.prototype.getFactory = function() {
  if(factory === undefined) {
    var factoryManager = Object.create(ClientFactoryManager.prototype);
    factory = factoryManager.initialize();
  }

  return factory;
};

module.exports = Client;
