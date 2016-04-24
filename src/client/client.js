var CommandFactory = require('./video/EncoderCommandFactory');
var PlayerController = require('./video/PlayerController');

var RequestFactory = require('./socket/ClientRequestFactory');
var ClientSocket = require('./socket/ClientSocket');
var FileBuffer = require('./video/FileBuffer');

function Client(video, mediaSource, window, flag) {
  var path = "/home/sabo-kun/repo/video-sync-2/static/media/";
  var fileBuffer = new FileBuffer();
  var playerController = new PlayerController(fileBuffer);

  var clientSocket = new ClientSocket(function(){
    playerController.initializeVideo(video, mediaSource, window);
    clientSocket.initialize(playerController, fileBuffer);
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
