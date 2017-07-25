const Promise               = require('bluebird');
const ClientFactoryManager  = require('./factory/ClientFactoryManager');

var factory, log;

function Client() { }

Client.prototype.initialize = Promise.coroutine(function* (serverUrl) {
  if(typeof Client.prototype.protoInit === 'undefined') {
    Client.prototype.protoInit = true;
    this.getFactory();

    var logManager = factory.createClientLogManager();
    log = logManager.getLog(logManager.LogEnum.GENERAL);

    clientSocket = factory.createClientSocket();
    var response = yield clientSocket.connectAsync(serverUrl);
    log.ui('Authenticated with server.');

    if(response[0]) {
      var acknowledge = response[0];
    } else {
      throw new Error('The server did not send an acknowledge hook.');
    }

    var isAdmin = response[1] ? response[1] : false;
    yield initComponents.call(this, isAdmin);
    acknowledge();

    return new Promise.resolve(isAdmin);
  }
});

Client.prototype.initMedia = Promise.coroutine(function* (videoElement, mediaSource) {
  var mediaController = factory.createMediaController(true);
  if(mediaController instanceof Promise) {
    yield mediaController;
  }

  return new Promise.resolve(mediaController);
});

Client.prototype.getFactory = function() {
  if(!factory) {
    var factoryManager = Object.create(ClientFactoryManager.prototype);
    factory = factoryManager.initialize();
  }

  return factory;
};

module.exports = Client;

var initComponents = Promise.coroutine(function* (isAdmin) {
  var fileBuffer = factory.createFileBuffer(true);
  var chatUtil   = factory.createChatUtil(true);

  if(isAdmin) {
    var formData = factory.createFormData(true);
    yield formData.requestFormData();
  }
});
