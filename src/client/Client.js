const Promise               = require('bluebird');
const ClientFactoryManager  = require('./factory/ClientFactoryManager');

var factory;

function Client() { }

Client.prototype.initialize = Promise.coroutine(function* (video, serverUrl, logCallback) {
  if(typeof Client.prototype.protoInit === 'undefined') {
    Client.prototype.protoInit = true;
    var factoryManager = Object.create(ClientFactoryManager.prototype);
    factory = factoryManager.initialize();

    var logManager = factory.createClientLogManager();
    logManager.addUILogging(logCallback);

    clientSocket = factory.createClientSocket();
    var acknowledge = yield clientSocket.connectAsync(serverUrl);
    acknowledge();

    /*
    var fileBuffer = factory.createFileBuffer();
    var formData = factory.createFormDataSingleton();
    var mediaController = factory.createMediaController();
    var chatUtil = factory.createChatUtil();

    fileBuffer.setupEvents();
    chatUtil.setupEvents();
    formData.setupEvents();
    formData.initializeData();
    */

    return new Promise.resolve();
  }
});

Client.prototype.getFactory = function() {
  return factory;
};

module.exports = Client;
