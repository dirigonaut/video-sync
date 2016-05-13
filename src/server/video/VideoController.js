var VideoStream     = require('./VideoStream');
var EncoderManager  = require('./encoding/EncoderManager');
var WebmMetaData    = require('./meta/WebmMetaData');
var Session         = require('../utils/Session');
var Validator       = require('../utils/Validator');

var validator       = new Validator();

function VideoController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
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

    var encoderManager = new EncoderManager(validator.sterilizeVideoInfo(data));
    encoderManager.on('webm', function(path) {
      genWebmMeta(path);
    }).on('finished', function(path) {
      socket.emit('video-encoded');
    });

    encoderManager.encode();
  });

  socket.on('get-meta-files', function(requestId) {
    console.log('get-meta-files');
    var session = new Session("./static/media/bunny/");

    var readConfig = VideoStream.streamConfig(session.getDetails().baseDir, function(file){
      var header = new Object();
      header.type = file.type;

      socket.emit("file-register-response", {requestId: validator.sterilizeVideoInfo(requestId), header: header}, function(bufferId) {
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
    var data = validator.sterilizeVideoInfo(data);
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
