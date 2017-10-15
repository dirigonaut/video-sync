const Promise = require('bluebird');

var encoderManager, media, fileIO, fileSystemUtils, schemaFactory, sanitizer, eventKeys, log;

function EncodingController() { }

EncodingController.prototype.initialize = function() {
  if(typeof EncodingController.prototype.protoInit === 'undefined') {
    EncodingController.prototype.protoInit = true;
    fileIO          = this.factory.createFileIO();
    encoderManager  = this.factory.createEncoderManager();
    media           = this.factory.createMedia();

    fileSystemUtils = this.factory.createFileSystemUtils();
    schemaFactory   = this.factory.createSchemaFactory();
    sanitizer       = this.factory.createSanitizer();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.VIDEO);
  }
};

EncodingController.prototype.attachSocket = function(socket) {
  log.info("VideoController.attachSocket");
  socket.on(eventKeys.ENCODE, Promise.coroutine(function* (data) {
    log.debug(eventKeys.ENCODE, data);
    yield fileIO.ensureDirExistsAsync(data.directory, 484);
    var processes;

    try {
      processes = encoderManager.buildProcess(data.encodings);
    } catch(err) {
      log.error(err)
      socket.emit(eventKeys.INPUTERROR, err);
    }

    if(processes) {
      yield encoderManager.encode(processes).then(function() {
        socket.emit(eventKeys.ENCODED);
      });
    }
  }));

  socket.on(eventKeys.GETMETA, Promise.coroutine(function* (data) {
    log.debug(eventKeys.GETMETA, data);
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.SPECIAL);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      var command = this.factory.createCommand();
      var ffprobe = this.factory.createFfprobeProcess();
      ffprobe.setCommand(command.parse(request.data));

      var metaData = yield ffprobe.execute().catch(function(err) {
        log.error(err);
        socket.emit(eventKeys.META);
      });

      var result = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.RESPONSE, [metaData]);
      socket.emit(eventKeys.META, result);
    }
  }.bind(this)));
};

module.exports = EncodingController;
