const Promise = require('bluebird');

var cache, session, fileIO, encoderManager, fileSystemUtils, validator, log;

function VideoController() { }

VideoController.prototype.initialize = function(force) {
  if(typeof VideoController.prototype.protoInit === 'undefined') {
    VideoController.prototype.protoInit = true;
    fileSystemUtils = this.factory.createFileSystemUtils();
    validator       = this.factory.createValidator();
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

VideoController.prototype.attachSocket = function(io, socket) {
  log.info("VideoController.attachSocket");
  socket.on('video-encode', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      log.debug('video-encode', data);
      var request = validator.sterilizeVideoInfo(data);
      var exists  = yield fileIO.ensureDirExistsAsync(request[0].outputDir, 484);

      if(exists) {
        var processes = encoderManager.buildProcess(request);
        yield encoderManager.encode(processes).then(function() {
          socket.emit('video-encoded');
        });
      } else {
        throw new Error(`Path ${request[0].outputDir} does not exist.`)
      }
    }
  }));

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
      var command = this.factory.createCommand();
      var ffprobe = this.factory.createFfprobeProcess();
      ffprobe.setCommand(command.parse(data[i].input));

      var metaData = yield ffprobe.execute();
      socket.emit("meta-info", metaData);
    }
  }));
};

module.exports = VideoController;
