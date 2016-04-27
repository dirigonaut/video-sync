var CommandFactory = require('./utils/EncoderCommandFactory');
var MediaController = require('./video/MediaController');

var RequestFactory = require('./utils/RequestFactory');
var ClientSocket = require('./socket/ClientSocket');
var FileBuffer = require('./utils/FileBuffer');

function Client(video, mediaSource, window, flag) {
  var path = "/home/sabo-kun/repo/video-sync-2/static/media/";
  var fileBuffer = new FileBuffer();
  var mediaController = new MediaController(fileBuffer);

  var clientSocket = new ClientSocket(function(){
    mediaController.initializeVideo(video, mediaSource, window);
    clientSocket.initialize(mediaController, fileBuffer);
  }, flag);
}

Client.prototype.encode = function() {
  var commands = [];
  commands.push(CommandFactory.build_ffmpeg_request(path + "bunny.mov", "640x360", "1"));
  commands.push(CommandFactory.build_ffmpeg_request(path + "bunny.mov", "128k", "2"));
  commands.push(CommandFactory.get_ffmpeg_manifest_command(commands, path + "bunny.mpd"));

  ClientSocket.sendRequest('video-encode', commands);
};

module.exports = Client;
