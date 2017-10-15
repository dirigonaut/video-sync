const Promise = require('bluebird');

var cache, media, fileIO, encoderManager, fileSystemUtils, schemaFactory, sanitizer, eventKeys, log;

function VideoController() { }

VideoController.prototype.initialize = function() {
  if(typeof VideoController.prototype.protoInit === 'undefined') {
    VideoController.prototype.protoInit = true;
    fileSystemUtils = this.factory.createFileSystemUtils();
    schemaFactory   = this.factory.createSchemaFactory();
    sanitizer       = this.factory.createSanitizer();
    eventKeys       = this.factory.createKeys();

    fileIO          = this.factory.createFileIO();
    encoderManager  = this.factory.createEncoderManager();
    cache           = this.factory.createCache();
    media           = this.factory.createMedia();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.VIDEO);
  }
};

VideoController.prototype.attachSocket = function(socket) {
  log.info("VideoController.attachSocket");

  socket.on(eventKeys.FILES, Promise.coroutine(function* (data) {
    log.debug(eventKeys.FILES, data);
    var schema = schemaFactory.createDefinition(schemaFactory.Enum.STRING);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      yield getFiles(socket, request, "mpd");
    }
  }));

  socket.on(eventKeys.SUBTITLES, Promise.coroutine(function* (data) {
    log.debug(eventKeys.SUBTITLES, data);
    var schema = schemaFactory.createDefinition(schemaFactory.Enum.STRING);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      yield getFiles(socket, request, "vtt");
    }
  }));

  socket.on(eventKeys.SEGMENT, Promise.coroutine(function* (data) {
    log.debug(eventKeys.SEGMENT, data);
    var schema = schemaFactory.createDefinition(schemaFactory.Enum.VIDEO);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      var basePath = yield media.getMediaPath();
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

var getFiles = Promise.coroutine(function* (socket, request, fileType) {
  var basePath = yield media.getMediaPath();

  if(basePath) {
    var files = yield fileIO.readDirAsync(basePath, fileType);

    if(files && files.length > 0) {
      for(let i = 0; i < files.length; ++i) {
        var header = { };
        var splitName = files[i].split(".")[0].split("_");
        header.type = splitName[splitName.length - 1];

        let result = schemaFactory.createPopulatedSchema(schemaFactory.Enum.SCHEMAS.IDRESPONSE, [request.data, header]);
        socket.emit(eventKeys.FILEREGISTER, result, function(bufferId) {
          var onData = function(bufferData) {
            var result = schemaFactory.createPopulatedSchema(schemaFactory.Enum.IDRESPONSE, [bufferId, bufferData]);
            socket.emit(eventKeys.FILESEGMENT, result);
          };

          var onFinish = function() {
            var result = schemaFactory.createPopulatedSchema(schemaFactory.Enum.IDRESPONSE, [bufferId, null]);
            socket.emit(eventKeys.FILEEND, result);
          };

          fileIO.read(`${fileSystemUtils.ensureEOL(basePath)}${files[i]}`, {}, onData, onFinish);
        });
      }
    } else {
      var result = schemaFactory.createPopulatedSchema(schemaFactory.Enum.IDRESPONSE, [request.data, '']);
      socket.emit(eventKeys.NOFILES, result);
    }
  }
});
