const Promise = require('bluebird');

var cache, session, fileIO, encoderManager, fileSystemUtils, schemaFactory, sanitizer, eventKeys, log;

function VideoController() { }

VideoController.prototype.initialize = function(force) {
  if(typeof VideoController.prototype.protoInit === 'undefined') {
    VideoController.prototype.protoInit = true;
    fileSystemUtils = this.factory.createFileSystemUtils();
    schemaFactory   = this.factory.createSchemaFactory();
    sanitizer       = this.factory.createSanitizer();
    eventKeys       = this.factory.createKeys();

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

  socket.on(eventKeys.FILES, Promise.coroutine(function* (data) {
    log.debug(eventKeys.FILES, data);
    var schema = schemaFactory.createDefinition(schemaFactory.Enum.STRING);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

    if(request) {
      var basePath = yield session.getMediaPath();

      if(basePath) {
        var files = yield fileIO.readDirAsync(basePath, "mpd");

        if(files) {
          for(let i = 0; i < files.length; ++i) {
            var header = { };
            var splitName = files[i].split(".")[0].split("_");
            header.type = splitName[splitName.length - 1];

            let result = schemaFactory.createPopulatedSchema(schemaFactory.Enum.IDRESPONSE, [request.data, header]);
            socket.emit(eventKeys.FILEREGISTER, result, function(bufferId) {
              var readConfig = fileIO.createStreamConfig(`${fileSystemUtils.ensureEOL(basePath)}${files[i]}`, function(bufferData) {
                var result = schemaFactory.createPopulatedSchema(schemaFactory.Enum.IDRESPONSE, [bufferId, bufferData]);
                socket.emit(eventKeys.FILESEGMENT, result);
              });

              readConfig.onFinish = function() {
                var result = schemaFactory.createPopulatedSchema(schemaFactory.Enum.IDRESPONSE, [bufferId, null]);
                socket.emit(eventKeys.FILEEND, result);
              };

              fileIO.read(readConfig);
            });
          }
        }
      }
    }
  }));

  socket.on(eventKeys.SEGMENT, Promise.coroutine(function* (data) {
    log.debug(eventKeys.SEGMENT, data);
    var schema = schemaFactory.createDefinition(schemaFactory.Enum.VIDEO);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

    if(request) {
      var basePath = yield session.getMediaPath();
      if(basePath) {
        var sendResponse = function(segment) {
          log.info(`Returning segment ${segment.name} of size ${segment.data ? segment.data.byteLength : null}`);
          socket.emit(eventKeys.SEGMENTCHUNK, segment);
        };

        cache.getSegment(request, sendResponse);
      }
    }
  }));
};

module.exports = VideoController;
