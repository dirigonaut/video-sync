const Promise = require('bluebird');

var encodeProcess, fileIO, schemaFactory, sanitizer, eventKeys, config, log;

function EncodingController() { }

EncodingController.prototype.initialize = function() {
  if(typeof EncodingController.prototype.protoInit === 'undefined') {
    EncodingController.prototype.protoInit = true;
    config          = this.factory.createConfig();
    fileIO          = this.factory.createFileIO();

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
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.PAIR);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      if(!encodeProcess) {
        encodeProcess = Spawn('node', ['pathToCode', [request.quality], request.dir],
          { detached: true, stdio: [ 'ignore' ] });
        encodeProcess.unref(/*Detach the process from the parent so it will continue even if the server is shut down*/);

        log.socket(`Starting encoding process for Id: ${request.quality}, Path: ${request.dir},
          Pid: ${encodeProcess.pid}`);

        encodeProcess.on('error', function(e) {
          log.error(`Encoding process Id: ${request.quality}, Path: ${request.dir},
            Pid: ${encodeProcess.pid}:`, e);
        });

        encodeProcess.on('exit', function(exitCode) {
          encodeProcess = undefined;
          log.socket(`Encoding process for Id: ${request.quality}, Path: ${request.dir},
            Pid: ${encodeProcess.pid} exited with code: ${exitCode}`);
        });
      } else {
        log.socket("Error: an encoding process already exists with pid:", encodeProcess.pid);
      }
    }
  }));

  socket.on(eventKeys.CANCELENCODE, Promise.coroutine(function* () {
    log.debug(eventKeys.CANCELENCODE, encodeProcess.pid);

    try {
      encodeProcess.kill();
      log.debug("Killed process: ", encodeProcess.pid);
      log.socket("Killed process: ", encodeProcess.pid);
    } catch(e) {
      log.error(`Error killing process: ${encodeProcess.pid}`,e);
    }
  }));

  socket.on(eventKeys.GETENCODESTATUS, Promise.coroutine(function* () {
    log.debug(eventKeys.GETENCODESTATUS);
    var logPath = Path.join(config.getConfig().dirs.encodeDir, `Plan-${encodeProcess.pid}.json`);
    var plan = yield Fs.readFileAsync(planPath);

    socket.emit(eventKeys.ENCODESTATUS, plan);
  }));
};

module.exports = EncodingController;
