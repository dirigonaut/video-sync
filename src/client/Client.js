const Promise               = require('bluebird');
const ClientFactoryManager  = require('./factory/ClientFactoryManager');

var resetMedia, factory;

function Client() { }

Client.prototype.initialize = function(serverUrl) {
  var factory = this.getFactory();

  if(typeof Client.prototype.protoInit === 'undefined') {
    Client.prototype.protoInit = true;
    var logManager = factory.createClientLogManager();
    var log = logManager.getLog(logManager.Enums.LOGS.GENERAL);
  }

  var clientSocket = factory.createClientSocket();

  return clientSocket.connectAsync(serverUrl)
  .then(function(response) {
    log.ui('Authenticated with server.');

    var isAdmin = response[1] ? true : false
    var acknowledged = response[0] !== 'undefined' ? response[0] : undefined;
    initComponents.call(this, isAdmin);

    return { 'acknowledge': acknowledged, 'isAdmin': isAdmin };
  });
};

Client.prototype.startMedia = Promise.coroutine(function* (mediaController, domElements) {
  if(resetMedia) {
    yield resetMedia();
  }

  resetMedia = yield mediaController.setup(domElements);
});

Client.prototype.getFactory = function() {
  if(factory === undefined) {
    var factoryManager = Object.create(ClientFactoryManager.prototype);
    factory = factoryManager.initialize();
  }

  return factory;
};

module.exports = Client;

var initComponents = function(isAdmin) {
  var fileBuffer = factory.createFileBuffer();

  if(isAdmin) {
    var formData = factory.createFormData();
  }
};
