var FileIO          = require('../utils/FileIO');
var EncoderManager  = require('./encoding/EncoderManager');
var WebmMetaData    = require('./metadata/WebmMetaData');
var Session         = require('../administration/Session');
var Validator       = require('../authentication/Validator');
var XmlUtil         = require('./metadata/xml/XmlUtil');
var MpdUtil         = require('./metadata/MpdUtil');
var LogManager      = require('../log/LogManager');
var PlayerManager   = require('../player/PlayerManager');

var playerManager   = new PlayerManager();
var validator       = new Validator();
var session         = new Session();
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
    log.silly('get-segment', data);
    var requestData = validator.sterilizeVideoInfo(data);
    var fileIO = new FileIO();

    if(session.getMediaPath() !== null && session.getMediaPath().length > 0) {
      var key = `${requestData.path}-${requestData.segment[0]}-${requestData.segment[1]}-${requestData.typeId}`;

      var handleResponse = function(segment) {
        log.silly('Returning segment for request: ', data);
        socket.emit("segment-chunk", segment);
      };

      var readConfig = fileIO.createStreamConfig(session.getMediaPath() + requestData.path, function onData(data, index) {
        var segment = new Object();
        segment.typeId = requestData.typeId;
        segment.name = key;
        segment.data = data;
        segment.index = index;

        handleResponse(segment);
      });

      var options = {"start": parseInt(requestData.segment[0]), "end": parseInt(requestData.segment[1])};
      readConfig.options = options;

      readConfig.onFinish = function onFinish(index) {
        var segment = new Object();
        segment.typeId = requestData.typeId;
        segment.name = key;
        segment.data = null;
        segment.index = index;

        handleResponse(segment);
      };

      fileIO.read(readConfig);
    }
  });
}

module.exports = VideoController;
