var VideoStream     = require('./VideoStream');
var EncoderManager  = require('./encoding/EncoderManager');
var WebmMetaData    = require('./meta/WebmMetaData');
var Session         = require('../utils/Session');

function VideoController(socket, build_request, val_util) {
  console.log("Attaching VideoController");

  socket.on('video-encode', function(data) {
    console.log('video-encode');

    var genWebmMeta = function (path) {
      var meta = new WebmMetaData();
      meta.on('finished', function() {
        socket.emit('video-encoded');
      });

      meta.generateMetaData(path);
    };

    var encoderManager = new EncoderManager(val_util.check_video_info(data));
    encoderManager.on('webm', function(path) {
      genWebmMeta(path);
    }).on('finished', function(path) {
      socket.emit('video-encoded');
    });

    encoderManager.encode();
  });

  socket.on('video-meta', function(data) {
    console.log('video-meta');
    var meta = new WebmMetaData();
    meta.generateMetaData(build_request(socket, val_util.check_video_info(data)));
  });

  socket.on('get-meta-files', function(requestId) {
    console.log('get-meta-files');
    var session = new Session();

    var readConfig = VideoStream.streamConfig(session.getDetails().baseDir, function(file){
      var header = new Object();
      header.type = file.type;

      socket.emit("file-register-response", {requestId: requestId, header: header}, function(bufferId) {
        var readConfig = VideoStream.streamConfig(file.path, function(data) {
          socket.emit("file-segment", {bufferId: bufferId, data: data});
        });

        readConfig.onFinish = function() {
          socket.emit("file-end", {bufferId: bufferId});
        };

        VideoStream.read(readConfig);
      });
    });

    VideoStream.readDir(readConfig);
  });

  socket.on('get-segment', function(data) {
    console.log('get-segment');
    var data = val_util.check_video_info(data);
    var typeId = data.typeId;

    var readConfig = VideoStream.streamConfig(data.path, function(data) {
      var segment = new Object();
      segment.typeId = typeId;
      segment.data = data;

      socket.emit("segment-chunk", segment);
    });

    if(data.segment) {
      var options = {"start": parseInt(data.segment[0]), "end": parseInt(data.segment[1])};
      readConfig.options = options;
    } else {
      console.log("No segment options passed in.");
    }

    readConfig.onFinish = function() {
      socket.emit("segment-end");
    };

    VideoStream.read(readConfig);
  });
}

module.exports = VideoController;
