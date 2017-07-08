const Promise = require('bluebird');

var cache, session, fileIO, encoderManager, fileSystemUtils, schemaFactory, log;

function VideoController() { }

VideoController.prototype.initialize = function(force) {
  if(typeof VideoController.prototype.protoInit === 'undefined') {
    VideoController.prototype.protoInit = true;
    fileSystemUtils = this.factory.createFileSystemUtils();
    schemaFactory       = this.factory.createSchemaFactory();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.VIDEO);
  }

  if(force === undefined ? typeof VideoController.prototype.stateInit === 'undefined' : force) {
    VideoController.prototype.stateInit = true;
    fileIO          = this.factory.createFileIO();
    encoderManager  = this.factory.createEncoderManager();
    cache           = this.factory.createCache();
    session         = this.factory.createSession();
  }
};

VideoController.prototype.attachSocket = function(socket) {
  log.info("VideoController.attachSocket");

  socket.on('get-meta-files', Promise.coroutine(function* (requestId) {
    log.debug('get-meta-files', requestId);
    var basePath = yield session.getMediaPath();

    if(basePath) {
      var files = yield fileIO.readDirAsync(basePath, "mpd");

      if(files) {
        for(let i = 0; i < files.length; ++i) {
          var header = { };
          var splitName = files[i].split(".")[0].split("_");
          header.type = splitName[splitName.length - 1];

          socket.emit("file-register-response", {requestId: requestId, header: header}, function(bufferId) {
            var readConfig = fileIO.createStreamConfig(`${fileSystemUtils.ensureEOL(basePath)}${files[i]}`, function(data) {
              socket.emit("file-segment", {bufferId: bufferId, data: data});
            });

            readConfig.onFinish = function() {
              socket.emit("file-end", {bufferId: bufferId});
            };

            fileIO.read(readConfig);
          });
        }
      }
    }
  }));

  socket.on('get-segment', Promise.coroutine(function* (data) {
    log.debug('get-segment', data);
    var data = data;

    var basePath = yield session.getMediaPath();
    if(basePath) {
      var sendResponse = function(segment) {
        log.info(`Returning segment ${segment.name} of size ${segment.data ? segment.data.byteLength : null}`);
        socket.emit("segment-chunk", segment);
      };

      cache.getSegment(data, sendResponse);
    }
  }));
};

module.exports = VideoController;
