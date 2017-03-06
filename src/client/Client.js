var ClientSocket = require('./socket/ClientSocket.js');
var ClientLogManager = require('./log/ClientLogManager');
var FormDataSingleton = require('./utils/FormDataSingleton');
var MediaController = require('./video/MediaController');
var RequestFactory = require('./utils/RequestFactory');
var CommandFactory = require('./utils/EncoderCommandFactory');
var FileBuffer = require('./utils/FileBuffer');
var ChatUtil = require('./utils/ChatUtil');
var FileUtil = require('../server/utils/FileSystemUtils');

var mediaController;
var fileBuffer;
var formData;
var chatUtil;
var fileUtil;

var clientLog = ClientLogManager.getLog();

function Client(videoElement) {
  clientLog.info("Client created");
  console.log("create client");

  fileBuffer = new FileBuffer();
  formData = new FormDataSingleton();
  mediaController = new MediaController(videoElement, fileBuffer);
  chatUtil = new ChatUtil();
  fileUtil = new FileUtil();

  fileBuffer.setupEvents();
  chatUtil.setupEvents();
  formData.setupEvents();
  formData.initializeData();
}

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

Client.GetClientSocket = function() {
  return new ClientSocket();
};

Client.ClientLogManager = function() {
  return ClientLogManager;
};

module.exports = Client;
