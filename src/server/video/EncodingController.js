const Promise = require('bluebird');

var encoderManager, session, fileIO, schemaFactory, sanitizer, log;

function EncodingController() { }

EncodingController.prototype.initialize = function(force) {
  if(typeof EncodingController.prototype.protoInit === 'undefined') {
    EncodingController.prototype.protoInit = true;
    schemaFactory   = this.factory.createSchemaFactory();
    sanitizer       = this.factory.createSanitizer();
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
  socket.on('video-encode', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);

    if(isAdmin) {
      log.debug('video-encode', data);
      var schema = schemaFactory.createDefinition(schemaFactory.Enum.ENCODE);
      var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

      if(request) {
        yield fileIO.ensureDirExistsAsync(request[0].outputDir, 484);

        var processes = encoderManager.buildProcess(request);
        yield encoderManager.encode(processes).then(function() {
          socket.emit('video-encoded');
        });
      }
    }
  }));

  socket.on('get-meta-info', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);

    if(isAdmin) {
      log.debug('get-meta-info', data);
      var schema = schemaFactory.createDefinition(schemaFactory.Enum.ENCODE);
      var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum));

      if(request) {
        var command = this.factory.createCommand();
        var ffprobe = this.factory.createFfprobeProcess();
        ffprobe.setCommand(command.parse(request[i].input));

        var metaData = yield ffprobe.execute();
        socket.emit("meta-info", metaData);
      }
    }
  }));
};

module.exports = EncodingController;
