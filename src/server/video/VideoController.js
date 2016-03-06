var VideoStream     = require('../../src/server/video/VideoStream');
var EncoderManager  = require('../../src/server/video/EncoderManager');
var WebmMetaData    = require('../../src/server/video/WebmMetaData');

var videoIO = null;

function VideoController(io) {
  videoIO = io.of("/video");
}

VideoController.prototype.initialize = function() {
  videoIO.on('connection', function (socket) {

    socket.on('video-encode', function(data) {
      console.log('video-encode');
      encoderManager.encode(val_util.check_video_info(data));
    });

    socket.on('video-meta', function(data) {
      console.log('video-meta');
      var meta = new WebmMetaData();
      meta.generateMetaData(build_request(socket, val_util.check_video_info(data)));
    });

    socket.on('get-file', function(data) {
      console.log('get-file');
      var request = build_request(socket, val_util.check_video_info(data));

      var readConfig = VideoStream.streamConfig(request.data.path, function(data) {
          request.socket.emit("file-segment", data);
      });

      if(request.data.options) {
        readConfig.options = request.data.options;
      }

      readConfig.onFinish = function() {
        request.socket.emit("file-end");
      };

      VideoStream.read(readConfig);
    });

    socket.on('get-segment', function(data) {
      console.log('get-segment');
      var request = build_request(socket, val_util.check_video_info(data));

      var readConfig = VideoStream.streamConfig(request.data.path, function(data) {
          request.socket.emit("video-segment", data);
      });

      if(request.data.segment) {
        var options = {"start": parseInt(request.data.segment[0]), "end": parseInt(request.data.segment[1])};
        readConfig.options = options;
      }

      readConfig.onFinish = function() {
        request.socket.emit("segment-end");
      };

      VideoStream.read(readConfig);
    });

    socket.on('video-types', function(data) {
      console.log('video-types');
      var request = build_request(socket, val_util.check_video_info(data));
      var readConfig = VideoStream.streamConfig(request.data.path, function(data){
        request.socket.emit('video-types', data);
      });

      VideoStream.readDir(readConfig);
    });
  }
}

module.exports = VideoController;
