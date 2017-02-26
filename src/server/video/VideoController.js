var FileIO          = require('../utils/FileIO');
var EncoderManager  = require('./encoding/EncoderManager');
var WebmMetaData    = require('./metadata/WebmMetaData');
var Session         = require('../administration/Session');
var Validator       = require('../authentication/Validator');
var XmlUtil         = require('./metadata/xml/XmlUtil');
var MpdUtil         = require('./metadata/MpdUtil');
var Cache           = require('../utils/Cache');
var LogManager      = require('../log/LogManager');
var PlayerManager   = require('../player/PlayerManager');

var playerManager   = new PlayerManager();
var validator       = new Validator();
var session         = new Session();
var cache           = new Cache();

function VideoController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  console.log("Attaching VideoController");

  socket.on('video-encode', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('video-encode');
      var fileIO = new FileIO();
      var request = validator.sterilizeVideoInfo(data);

      var genWebmMeta = function (path) {
        var webmMetaData = new WebmMetaData();

        var saveMetaToMpd = function(meta) {
          var xmlUtil = new XmlUtil();
          var xmlMeta = xmlUtil.webmMetaToXml(meta);

          var mpdUtil = new MpdUtil();
          mpdUtil.addSegmentsToMpd(path, xmlMeta, function() {
            socket.emit('webm-meta-generated');
          });
        };

        webmMetaData.generateWebmMeta(path, saveMetaToMpd);
      };

      var encoderManager = new EncoderManager(request);
      encoderManager.on('webm', function(path) {
        genWebmMeta(path);
      }).on('finished', function(path) {
        socket.emit('video-encoded');
      });

      var encode = function(flag) {
        if(flag == true) {
          encoderManager.encode();
        }
      }

      if(request[0]) {
        fileIO.ensureDirExists(request[0].outputDir, 484, encode);
      }
    }
  });

  socket.on('get-meta-files', function(requestId) {
    console.log('get-meta-files');
    var fileIO = new FileIO();

    var readConfig = FileIO.createStreamConfig(session.getMediaPath(), function(file){
      var header = new Object();
      header.type = file.type;

      socket.emit("file-register-response", {requestId: validator.sterilizeVideoInfo(requestId), header: header}, function(bufferId) {
        var readConfig = FileIO.createStreamConfig(file.path, function(data) {
          socket.emit("file-segment", {bufferId: bufferId, data: data});
        });

        readConfig.onFinish = function() {
          socket.emit("file-end", {bufferId: bufferId});
        };

        fileIO.read(readConfig);
      });
    });

    fileIO.readDir(readConfig);
  });

  socket.on('get-segment', function(data) {
    console.log('get-segment');
    var data = validator.sterilizeVideoInfo(data);

    if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
      var handleResponse = function(segment) {
        socket.emit("segment-chunk", segment);
      };

      cache.getSegment(playerManager.getPlayer(socket.id), data, handleResponse);
    }
  });
}

module.exports = VideoController;
