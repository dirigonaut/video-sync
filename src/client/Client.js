const util          = require('util');
const EventEmitter  = require('events');

var FormDataSingleton = require('./utils/FormDataSingleton');
var MediaController = require('./video/MediaController');
var RequestFactory = require('./utils/RequestFactory');
var CommandFactory = require('./utils/EncoderCommandFactory');
var ClientSocket = require('./socket/ClientSocket');
var FileBuffer = require('./utils/FileBuffer');
var ChatUtil = require('./utils/ChatUtil');
var FileUtil = require('../server/utils/FileSystemUtils');

var mediaController;
var clientSocket;
var fileBuffer;
var formData;
var chatUtil;
var fileUtil;

var isConnected;

function Client(videoElement, window, port) {
  console.log("Client");
  var self = this;

  isConnected = false;
  fileBuffer = new FileBuffer();
  clientSocket = new ClientSocket();
  formData = new FormDataSingleton();
  mediaController = new MediaController(videoElement, fileBuffer);
  chatUtil = new ChatUtil();
  fileUtil = new FileUtil();

  clientSocket.connect(function(){
    fileBuffer.setupEvents();
    chatUtil.setupEvents();
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
};

Client.prototype.getClientSocket = function() {
  return clientSocket;
};

Client.prototype.getMediaController = function() {
  return mediaController;
};

Client.prototype.getRequestFactory = function() {
  return new RequestFactory();
};

Client.prototype.getCommandFactory = function() {
  return CommandFactory;
};

Client.prototype.getFormDataSingleton = function() {
  return formData;
};

Client.prototype.getChatUtil = function() {
  return chatUtil;
};

Client.prototype.getFileUtil = function() {
  return fileUtil;
};

module.exports = Client;

function getServerUrl(window, port) {
  if(port != null && port != undefined) {
    return "https://127.0.0.1:" + port;
  }

  return window.location.host
}
