const Promise = require('bluebird');

var cache, session, fileIO, fileSystemUtils, validator, log;

function VideoController() { }

VideoController.prototype.initialize = function(io, socket) {
  if(typeof VideoController.prototype.protoInit === 'undefined') {
    VideoController.prototype.protoInit = true;

    cache           = this.factory.createCache();
    session         = this.factory.createSession();
    fileIO          = this.factory.createFileIO();
    fileSystemUtils = this.factory.createFileSystemUtils();
    validator       = this.factory.createValidator();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.VIDEO);
  }
};

VideoController.prototype.attachSocket = function(io, socket) {
  log.info("VideoController.attachSocket");
  socket.on('video-encode', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      log.debug('video-encode', data);
      var fileIO = this.factory.createFileIO();
      var request = validator.sterilizeVideoInfo(data);

      var genWebmMeta = function(path) {
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
      }.bind(this);

      var encoderManager = new EncoderManager(request);
      encoderManager.on('webm', function(path) {
        log.debug('Generate webm metadata', data);
        genWebmMeta(path);
      }.bind(this)).on('finished', function(path) {
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
  }.bind(this)));

  socket.on('get-meta-files', Promise.coroutine(function* (requestId) {
    log.debug('get-meta-files', requestId);

    var basePath = yield session.getMediaPath();
    if(basePath) {
      var readConfig = fileIO.createStreamConfig(basePath, function(files) {
        if(files) {
          for(let i = 0; i < files.length; ++i) {
            var header = {};
            var splitName = files[i].split(".")[0].split("_");
            header.type = splitName[splitName.length - 1];

            socket.emit("file-register-response", {requestId: validator.sterilizeVideoInfo(requestId), header: header}, function(bufferId) {
              var anotherReadConfig = fileIO.createStreamConfig(`${fileSystemUtils.ensureEOL(basePath)}${files[i]}`, function(data) {
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
  }));

  socket.on('get-segment', Promise.coroutine(function* (data) {
    log.debug('get-segment', data);
    var data = validator.sterilizeVideoInfo(data);

    var basePath = yield session.getMediaPath();
    if(basePath) {
      var sendResponse = function(segment) {
        log.info(`Returning segment ${segment.name} of size ${segment.data ? segment.data.byteLength : null}`);
        socket.emit("segment-chunk", segment);
      };

      cache.getSegment(data, sendResponse);
    }
  }));

  socket.on('get-meta-info', Promise.coroutine(function* (data) {
    log.debug('get-meta-info', data);
    var cleanData = validator.sterilizeVideoInfo(data);

    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var command = new Command(data);
      var ffprobeProcess = new FfprobeProcess();
      var metaData = yield ffprobeProcess.process(command);
      socket.emit("meta-info", metaData);
    }
  }));
};

module.exports = VideoController;
