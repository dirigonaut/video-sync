const Promise               = require('bluebird');
const ClientFactoryManager  = require('./factory/ClientFactoryManager');

var factory, log;

function Client() { }

Client.prototype.initialize = Promise.coroutine(function* (video, serverUrl, logCallback) {
  if(typeof Client.prototype.protoInit === 'undefined') {
    Client.prototype.protoInit = true;
    var factoryManager = Object.create(ClientFactoryManager.prototype);
    factory = factoryManager.initialize();

    var logManager = factory.createClientLogManager();
    logManager.addUILogging(logCallback);
    log = logManager.getLog(logManager.LogEnum.GENERAL);
    log.ui('Added UI logging.');

    clientSocket = factory.createClientSocket();
    var response = yield clientSocket.connectAsync(serverUrl, isAdmin);
    log.ui('Authenticated with server.');
    
    if(response[0]) {
      var acknowledge = response[0];
    } else {
      throw new Error('The server did not send an acknowledge hook.');
    }

    var isAdmin = response[1] ? response[1] : false;
    yield this.initComponents(isAdmin);
    acknowledge();

    return new Promise.resolve(isAdmin);
  }
});

Client.prototype.initComponents = Promise.coroutine(function* (isAdmin) {
  var fileBuffer      = factory.createFileBuffer(true);
  var chatUtil        = factory.createChatUtil(true);
  //var mediaController = factory.createMediaController(true);

  if(isAdmin) {
    var formData = factory.createFormData(true);
    yield formData.requestFormData();
  }

  return new Promise.resolve();
});

Client.prototype.getFactory = function() {
  return factory;
};

module.exports = Client;
