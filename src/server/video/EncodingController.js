const Promise = require('bluebird');

var encoderManager, session, fileIO, fileSystemUtils, schemaFactory, sanitizer, eventKeys, log;

function EncodingController() { }

EncodingController.prototype.initialize = function(force) {
  if(typeof EncodingController.prototype.protoInit === 'undefined') {
    EncodingController.prototype.protoInit = true;
    fileSystemUtils = this.factory.createFileSystemUtils();
    schemaFactory   = this.factory.createSchemaFactory();
    sanitizer       = this.factory.createSanitizer();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.VIDEO);
  }

  if(force === undefined ? typeof EncodingController.prototype.stateInit === 'undefined' : force) {
    EncodingController.prototype.stateInit = true;
    fileIO          = this.factory.createFileIO();
    encoderManager  = this.factory.createEncoderManager();
    session         = this.factory.createSession();
  }
};

EncodingController.prototype.attachSocket = function(socket) {
  log.info("VideoController.attachSocket");
  socket.on(eventKeys.ENCODE, Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);

    if(isAdmin) {
      log.debug(eventKeys.ENCODE, data);
      yield fileIO.ensureDirExistsAsync(data.directory, 484);

      var processes = encoderManager.buildProcess(data.encodings);
      yield encoderManager.encode(processes).then(function() {
        socket.emit(eventKeys.ENCODED);
      });
    }
  }));

  socket.on(eventKeys.GETMETA, Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);

    if(isAdmin) {
      log.debug(eventKeys.GETMETA, data);
      var schema = schemaFactory.createDefinition(schemaFactory.Enum.SPECIAL);
      var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

      if(request) {
        var command = this.factory.createCommand();
        var ffprobe = this.factory.createFfprobeProcess();
        ffprobe.setCommand(command.parse(request.data));

        var metaData = yield ffprobe.execute().catch(function(err) {
          log.error(err);
          socket.emit(eventKeys.META);
        });

        var result = schemaFactory.createPopulatedSchema(schemaFactory.Enum.RESPONSE, [metaData]);
        socket.emit(eventKeys.META, result);
      }
    }
  }.bind(this)));
};

module.exports = EncodingController;
