var CommandFactory = require('./utils/EncoderCommandFactory');
var MediaController = require('./video/MediaController');
var RequestFactory = require('./utils/RequestFactory');
var ClientSocket = require('./socket/ClientSocket');
var FileBuffer = require('./utils/FileBuffer');

function Client(video, mediaSource, window, flag) {
  console.log("Client");
  var fileBuffer = new FileBuffer();
  var mediaController = new MediaController(fileBuffer);

  var clientSocket = new ClientSocket(function(path){
    mediaController.initializeVideo(video, mediaSource, window);
    clientSocket.initialize(mediaController, fileBuffer);
  }, flag);
}

Client.prototype.getClientSocket = function() {
  return ClientSocket;
}

Client.prototype.getRequestFactory = function() {
  return new RequestFactory();
}

Client.prototype.getCommandFactory = function() {
  return CommandFactory;
}

module.exports = Client;
