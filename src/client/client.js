var CommandFactory = require('./utils/EncoderCommandFactory');
var MediaController = require('./video/MediaController');
var RequestFactory = require('./utils/RequestFactory');
var ClientSocket = require('./socket/ClientSocket');
var FileBuffer = require('./utils/FileBuffer');

var base = "/home/sabo-san/Development/video-sync-2.0";
var input = "/static/media/";
var output = "/static/media/bunny/";

function Client(video, mediaSource, window, flag) {
  var fileBuffer = new FileBuffer();
  var mediaController = new MediaController(fileBuffer);

  var clientSocket = new ClientSocket(function(path){
    mediaController.initializeVideo(video, mediaSource, window);
    clientSocket.initialize(mediaController, fileBuffer);
  }, flag);
}

Client.prototype.encode = function() {
  var commands = [];
  commands.push(CommandFactory.build_ffmpeg_request(base + input + "bunny.mov", base + output, "640x360", "1"));
  commands.push(CommandFactory.build_ffmpeg_request(base + input + "bunny.mov", base + output, "128k", "2"));
  commands.push(CommandFactory.get_ffmpeg_manifest_command(commands, base + output + "bunny.mpd"));

  ClientSocket.sendRequest('video-encode', commands);
};

Client.prototype.getClientSocket = function() {
  return ClientSocket;
}

Client.prototype.getRequestFactory = function() {
  return RequestFactory;
}

Client.prototype.getCommandFactory = function() {
  return CommandFactory;
}

module.exports = Client;
