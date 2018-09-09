const Promise = require('bluebird');
const Events  = require('events');
const Path    = require('path');

const Spawn = require('child_process').spawn;

const DUR_REG=/(Duration:\s)(\d{2,}:)+(\d{2,})(.\d{2,})/g;
const CUR_REG=/(time=)(\d{2,}:)+(\d{2,})(.\d{2,})/g;

var fileIO, config, log;

function FfmpegProcess() { }

FfmpegProcess.prototype.initialize = function() {
  if(typeof FfmpegProcess.prototype.protoInit === 'undefined') {
    FfmpegProcess.prototype.protoInit = true;
    Object.setPrototypeOf(FfmpegProcess.prototype, Events.prototype);
    fileIO          = this.factory.createFileIO();
    config          = this.factory.createConfig();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);
  }
};

FfmpegProcess.prototype.setCommand = function(command) {
  this.command = command;
};

FfmpegProcess.prototype.execute = Promise.coroutine(function* () {
  var ffmpegPath = config.getConfig() ? config.getConfig().external.ffmpeg : undefined;
  yield fileIO.ensureDirExistsAsync(Path.dirname(this.command[this.command.length - 1]));

  this.ffmpeg = Spawn(ffmpegPath ? ffmpegPath : "ffmpeg", this.command);
  log.info(`Spawned child pid: ${this.ffmpeg.pid}`, this.command);

  this.ffmpeg.on('close', function(data) {
    log.info(`Closed child pid: `, this.ffmpeg.pid);
    this.emit('exit', data);
  }.bind(this));

  this.ffmpeg.stderr.on('data', function(data) {
    dur = DUR_REG.exec(data.toString('utf8'));
    cur = CUR_REG.exec(data.toString('utf8'));
    this.emit('data',
      cur && cur.length > 0 ? cur[0] : null,
      dur && dur.length > 0 ? dur[0] : null);
  }.bind(this));

  this.ffmpeg.on('error', function(data) {
    this.emit('error', data.toString('utf8'));
  }.bind(this));

  this.emit('start');
});

FfmpegProcess.prototype.setLoggingPath = function(key) {
  if(arguments.length === 3) {
    if(config.getConfig().log.logEncoding) {
      var name = `${key}.log`
      return `> ${Path.join(config.getConfig().dirs.encodeLogDir, name)}`;
    }
  } else {
    log.debug(`FfmpegProcess failed at adding logging to: `, this.command);
  }
};

FfmpegProcess.prototype.cancel = function() {
  try {
    this.ffmpeg.kill();
  } catch(e) {
    log.error(e);
  }
};

FfmpegProcess.prototype.inspect = function() {
  return { "FfmpegProcess" : this.command };
}

module.exports = FfmpegProcess;
