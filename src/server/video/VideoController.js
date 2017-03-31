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
var log             = LogManager.getLog(LogManager.LogEnum.VIDEO);

function VideoController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  log.info("Attaching VideoController");

  socket.on('video-encode', function(data) {
    if(session.isAdmin(socket.id)) {
      log.debug('video-encode', data);
      var fileIO = new FileIO();
      var request = validator.sterilizeVideoInfo(data);

      var genWebmMeta = function (path) {
        var webmMetaData = new WebmMetaData();

        var saveMetaToMpd = function(meta) {
          log.debug('Save webm metadata', meta);
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
        log.debug('Generate webm metadata', data);
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
    log.debug('get-meta-files', requestId);
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
    var fileIO = new FileIO();
    var data = validator.sterilizeVideoInfo(data);

    var key = `${data.path}-${data.segment[0]}-${data.segment[1]}-${data.typeId}`;
    var typeId = data.typeId;
    var counter = 0;

    if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
      var readConfig = fileIO.createStreamConfig(session.getMediaPath() + data.path, function(data) {
        var segment = new Object();
        segment.typeId = typeId;
        segment.name = key;
        segment.data = data;
        segment.index = counter;
        socket.emit("segment-chunk", segment);
        counter++;
      });

      if(data.segment) {
        var options = {"start": parseInt(data.segment[0]), "end": parseInt(data.segment[1])};
        readConfig.options = options;

      } else {
        console.log("No segment options passed in.");
      }

      readConfig.onFinish = function() {
        var segment = new Object();
        segment.typeId = data.typeId;
        segment.name = key;
        segment.data = null;
        segment.index = counter;
        socket.emit("segment-chunk", segment);
      };

      fileIO.read(readConfig);
    }
  });
}

module.exports = VideoController;
