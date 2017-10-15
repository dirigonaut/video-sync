const Promise               = require('bluebird');
const ClientFactoryManager  = require('./factory/ClientFactoryManager');

var resetMedia, factory;

function Client() { }

Client.prototype.initialize = function(serverUrl) {
  if(typeof Client.prototype.protoInit === 'undefined') {
    Client.prototype.protoInit = true;
    var factoryManager = Object.create(ClientFactoryManager.prototype);
    factory = factoryManager.initialize();

    var logManager = factory.createClientLogManager();
    var log = logManager.getLog(logManager.Enums.LOGS.GENERAL);
  });

  var clientSocket = factory.createClientSocket();

  return clientSocket.connectAsync(serverUrl)
  .then(function(response) {
    log.ui('Authenticated with server.');

    var isAdmin = response[1] ? true : false
    var acknowledged = response[0] ? response[0] : throw new Error('Missing connection hook from server authentication.');
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
  return factory;
};

module.exports = Client;

var initComponents = function(isAdmin) {
  var fileBuffer = factory.createFileBuffer();

  if(isAdmin) {
    var formData = factory.createFormData();
  }
});
