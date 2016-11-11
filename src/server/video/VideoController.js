var VideoStream     = require('./VideoStream');
var EncoderManager  = require('./encoding/EncoderManager');
var MpdUtils        = require('./meta/MpdUtil');
var WebmMetaData    = require('./meta/WebmMetaData');
var Session         = require('../administration/Session');
var Validator       = require('../authentication/Validator');
var Log             = require('../utils/Logger')

var validator       = new Validator();
var session         = new Session();

function VideoController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  console.log("Attaching VideoController");

  socket.on('video-encode', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('video-encode');
      var videoStream = new VideoStream();
      var request = validator.sterilizeVideoInfo(data);

      var genWebmMeta = function (path) {
        var meta = new WebmMetaData();
        meta.on('finished', function() {
          socket.emit('video-encoded');
        });

        meta.generateMetaData(path);
      };

      var genMp4Meta = function (path) {
        var mpdUtils = new MpdUtils();

        mpdUtils.generateMpd(path, function() {
          socket.emit('video-encoded');
        });
      };

      var encoderManager = new EncoderManager(request);
      encoderManager.on('webm', function(path) {
        genWebmMeta(path);
      }).on('mp4', function(path) {
        genMp4Meta(path);
      }).on('finished', function(path) {
        socket.emit('video-encoded');
      });

      var encode = function(flag) {
        if(flag == true) {
          encoderManager.encode();
        }
      }

      if(request[0]) {
        videoStream.ensureDirExists(request[0].outputDir, 484, encode);
      }
    }
  });

  socket.on('get-meta-files', function(requestId) {
    console.log('get-meta-files');
    var videoStream = new VideoStream();

    var readConfig = videoStream.createStreamConfig(session.getMediaPath(), function(file){
      var header = new Object();
      header.type = file.type;

      socket.emit("file-register-response", {requestId: validator.sterilizeVideoInfo(requestId), header: header}, function(bufferId) {
        var readConfig = videoStream.createStreamConfig(file.path, function(data) {
          socket.emit("file-segment", {bufferId: bufferId, data: data});
        });

        readConfig.onFinish = function() {
          socket.emit("file-end", {bufferId: bufferId});
        };

        videoStream.read(readConfig);
      });
    });

    videoStream.readDir(readConfig);
  });

  socket.on('get-segment', function(data) {
    console.log('get-segment');
    var videoStream = new VideoStream();
    var data = validator.sterilizeVideoInfo(data);
    var typeId = data.typeId;

    if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
      var readConfig = videoStream.createStreamConfig(session.getMediaPath() + data.path, function(data) {
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

      videoStream.read(readConfig);
    }
  });
}

module.exports = VideoController;
