const Promise = require('bluebird');

var encoderManager, media, redisSocket, fileIO, fileSystemUtils, schemaFactory, sanitizer, eventKeys, log;

function EncodingController() { }

EncodingController.prototype.initialize = function() {
  if(typeof EncodingController.prototype.protoInit === 'undefined') {
    EncodingController.prototype.protoInit = true;

    fileIO          = this.factory.createFileIO();
    encoderManager  = this.factory.createEncoderManager();
    media           = this.factory.createMedia();
    redisSocket     = this.factory.createRedisSocket();

    fileSystemUtils = this.factory.createFileSystemUtils();
    schemaFactory   = this.factory.createSchemaFactory();
    sanitizer       = this.factory.createSanitizer();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.VIDEO);

    encoderManager.on('encodingList', function(results) {
      credentials.getAdmin().then(function(admin) {
        results = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.RESPONSE, [results]);
        redisSocket.ping.apply(EncodingController.prototype, [admin.id, eventKeys.ENCODINGS, results]);
      });
    });
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
      var results = yield encoderManager.encode(processes).then(function() {
        socket.emit(eventKeys.ENCODED);
      });
    }
  }));

  socket.on(eventKeys.CANCELENCODE, Promise.coroutine(function* (data) {
    log.debug(eventKeys.CANCELENCODE, data);
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.STRING);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      socket.emit(eventKeys.CONFIRM, `Are you sure you wish to cancel encoding id: ${request.data}?`, function(confirm) {
        if(confirm === true) {
          encoderManager.cancelEncode(request.data);
        }
      });
    }
  }));

  socket.on(eventKeys.GETENCODE, Promise.coroutine(function* () {
    log.debug(eventKeys.GETENCODE, data);
    encoderManager.getEncodings();
  }));

  socket.on(eventKeys.GETMETA, Promise.coroutine(function* (data) {
    log.debug(eventKeys.GETMETA, data);

    if(data.encodings) {
      var command = this.factory.createCommand();
      var ffprobe = this.factory.createFfprobeProcess();
      ffprobe.setCommand(command.parse(data.encodings));

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
