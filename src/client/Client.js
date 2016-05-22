var CommandFactory = require('./utils/EncoderCommandFactory');
var MediaController = require('./video/MediaController');
var RequestFactory = require('./utils/RequestFactory');
var ClientSocket = require('./socket/ClientSocket');
var FileBuffer = require('./utils/FileBuffer');

var clientSocket;

function Client(video, mediaSource, window) {
  console.log("Client");
  var fileBuffer = new FileBuffer();
  var mediaController = new MediaController(fileBuffer);

  clientSocket = new ClientSocket();

  console.log(window.location);
  clientSocket.connect(function(path){
    clientSocket.initialize(mediaController, fileBuffer);
  }, window.location.host);

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

module.exports = Client;
