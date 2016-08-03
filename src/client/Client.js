const util          = require('util');
const EventEmitter  = require('events');

var FormDataSingleton = require('./utils/FormDataSingleton');
var MediaController = require('./video/MediaController');
var RequestFactory = require('./utils/RequestFactory');
var CommandFactory = require('./utils/EncoderCommandFactory');
var ClientSocket = require('./socket/ClientSocket');
var FileBuffer = require('./utils/FileBuffer');

var mediaController;
var clientSocket;
var fileBuffer;
var formData;

var isConnected;

function Client(videoElement, window, port) {
  console.log("Client");
  var self = this;

  isConnected = false;
  fileBuffer = new FileBuffer();
  clientSocket = new ClientSocket();
  formData = new FormDataSingleton();
  mediaController = new MediaController(videoElement, fileBuffer);

  clientSocket.connect(function(){
    fileBuffer.setupEvents();
    formData.setupEvents();
    formData.initializeData();
    isConnected = true;
    self.emit('isConnected');
  }, getServerUrl(window, port));
}

util.inherits(Client, EventEmitter);

Client.prototype.initializeVideo = function(window, callback) {
  if(isConnected) {
    mediaController.initializeVideo(callback(), window);

    mediaController.on('readyToInitialize', function() {
      mediaController.initializeVideo(callback(), window);
    });
  }
}

Client.prototype.getClientSocket = function() {
  return clientSocket;
}

Client.prototype.getRequestFactory = function() {
  return new RequestFactory();
}

Client.prototype.getCommandFactory = function() {
  return CommandFactory;
}

Client.prototype.getFormDataSingleton = function() {
  return formData;
}

module.exports = Client;

function getServerUrl(window, port) {
  if(port != null && port != undefined) {
    return "http://127.0.0.1:" + port;
  }

  return window.location.host
}
