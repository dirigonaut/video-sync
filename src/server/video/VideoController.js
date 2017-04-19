var FileIO          = require('../utils/FileIO');
var EncoderManager  = require('./encoding/EncoderManager');
var WebmMetaData    = require('./metadata/WebmMetaData');
var Session         = require('../administration/Session');
var Validator       = require('../authentication/Validator');
var XmlUtil         = require('./metadata/xml/XmlUtil');
var MpdUtil         = require('./metadata/MpdUtil');
var Cache           = require('../utils/Cache');
var LogManager      = require('../log/LogManager');

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
    var ifAdmin = function(isAdmin) {
      if(isAdmin) {
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
    };

    session.isAdmin(socket.id, ifAdmin);
  });

  socket.on('get-meta-files', function(requestId) {
    log.debug('get-meta-files', requestId);

    var handleMediaPath = function(err, basePath) {
      if(err) {
        log.error(err);
      } else if(basePath !== null && basePath !== undefined && basePath.length > 0) {
        var fileIO = new FileIO();

        var readConfig = FileIO.createStreamConfig(basePath, function(file){
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
      }
    };

    session.getMediaPath(handleMediaPath);
  });

  socket.on('get-segment', function(data) {
    log.debug('get-segment', data);
    var data = validator.sterilizeVideoInfo(data);

    var handleMediaPath = function(err, basePath) {
      if(err) {
        log.error(err);
      } else if(basePath !== null && basePath !== undefined && basePath.length > 0) {
        var handleResponse = function(segment) {
          log.info('Returning segment for request: ', data);
          socket.emit("segment-chunk", segment);
        };

        cache.getSegment(data, handleResponse);
      }
    };

    session.getMediaPath(handleMediaPath);
  });
}

module.exports = VideoController;
