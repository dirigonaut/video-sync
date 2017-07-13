const Promise               = require('bluebird');
const ClientFactoryManager  = require('./factory/ClientFactoryManager');

var factory;

function Client() { }

Client.prototype.initialize = function(video, serverUrl, logCallback) {
  if(typeof Client.prototype.protoInit === 'undefined') {
    Client.prototype.protoInit = true;
    var factoryManager = Object.create(ClientFactoryManager.prototype);
    factory = factoryManager.initialize();

    var logManager = factory.createClientLogManager();
    logManager.addUILogging(logCallback);

    clientSocket = factory.createClientSocket();
    yield clientSocket.connect(serverUrl, function() { /*resolve promise*/ });

    var fileBuffer = factory.createFileBuffer();
    var formData = factory.createFormDataSingleton();
    var mediaController = factory.createMediaController();
    var chatUtil = factory.createChatUtil();

    fileBuffer.setupEvents();
    chatUtil.setupEvents();
    formData.setupEvents();
    formData.initializeData();
  }
});

Client.prototype.getFactory = function() {
  return factory;
};

module.exports = Client;
