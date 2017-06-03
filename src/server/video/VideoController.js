const Promise         = require('bluebird');
const FileIO          = require('../utils/FileIO');
const FileUtils       = require('../../server/utils/FileSystemUtils');
const EncoderManager  = require('./encoding/EncoderManager');
const FfprobeProcess  = require('./encoding/process/FfprobeProcess');
const WebmMetaData    = require('./metadata/WebmMetaData');
const Session         = require('../administration/Session');
const Validator       = require('../authentication/Validator');
const XmlUtil         = require('./metadata/xml/XmlUtil');
const MpdUtil         = require('./metadata/MpdUtil');
const Cache           = require('../utils/Cache');
const LogManager      = require('../log/LogManager');

var log             = LogManager.getLog(LogManager.LogEnum.VIDEO);
var validator, session, cache;

function lazyInit() {
  validator       = new Validator();
  session         = new Session();
  cache           = new Cache();
}

class VideoController {
  constructor(io, socket) {
    if(typeof VideoController.prototype.lazyInit === 'undefined') {
      lazyInit();
      VideoController.prototype.lazyInit = true;
    }

    initialize(io, socket);
  }
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

    var handleMediaPath = function(basePath) {
      if(basePath !== null && basePath !== undefined && basePath.length > 0) {
        var fileIO = new FileIO();
        var fileUtils = new FileUtils();

        var readConfig = fileIO.createStreamConfig(basePath, function(files) {
          if(files !== undefined && files !== null) {
            for(let i = 0; i < files.length; ++i) {
              var header = new Object();
              var splitName = files[i].split(".")[0].split("_");
              header.type = splitName[splitName.length - 1];

              socket.emit("file-register-response", {requestId: validator.sterilizeVideoInfo(requestId), header: header}, function(bufferId) {
                var anotherReadConfig = fileIO.createStreamConfig(`${fileUtils.ensureEOL(basePath)}${files[i]}`, function(data) {
                  socket.emit("file-segment", {bufferId: bufferId, data: data});
                });

                anotherReadConfig.onFinish = function() {
                  socket.emit("file-end", {bufferId: bufferId});
                };

                fileIO.read(anotherReadConfig);
              });
            }
          }
        });

        fileIO.readDir(readConfig, "mpd");
      }
    };

    session.getMediaPath(handleMediaPath);
  });

  socket.on('get-segment', function(data) {
    log.debug('get-segment', data);
    var data = validator.sterilizeVideoInfo(data);

    var handleMediaPath = function(basePath) {
      if(basePath !== null && basePath !== undefined && basePath.length > 0) {
        var handleResponse = function(segment) {
          log.info('Returning segment for request: ', data);
          socket.emit("segment-chunk", segment);
        };

        cache.getSegment(data, handleResponse);
      }
    };

    session.getMediaPath(handleMediaPath);
  });

  socket.on('get-meta-info', function(data) {
    log.debug('get-meta-info', data);


  });
}

module.exports = VideoController;
