var FormDataSingleton = require('./utils/FormDataSingleton');
var MediaController = require('./video/MediaController');
var RequestFactory = require('./utils/RequestFactory');
var CommandFactory = require('./utils/EncoderCommandFactory');
var ClientSocket = require('./socket/ClientSocket');
var FileBuffer = require('./utils/FileBuffer');

var clientSocket;
var formData;

function Client(video, mediaSource, window, port) {
  console.log("Client");
  var fileBuffer = new FileBuffer();
  var mediaController = new MediaController(fileBuffer);

  clientSocket = new ClientSocket();
  formData = new FormDataSingleton();

  clientSocket.connect(function(){
    fileBuffer.setupEvents();
    formData.setupEvents();
    formData.initialize();
  }, getServerUrl(window, port));

  var initMedia = function() {
    mediaController.initializeVideo(video, mediaSource, window);
  };

  clientSocket.setEvent("media-ready", initMedia);
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
    return "http://localhost:" + port;
  }

  return window.location.host
}
