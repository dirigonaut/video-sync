const Promise = require('bluebird');
const Events  = require('events');
const Util    = require('util');

const Spawn = require('child_process').spawn;

const DUR_REG=/(Duration:\s)(\d{2,}:)+(\d{2,})(.\d{2,})/g;
const CUR_REG=/(time=)(\d{2,}:)+(\d{2,})(.\d{2,})/g;

var config, log;

function FfmpegProcess() { }

FfmpegProcess.prototype.initialize = function() {
  if(typeof FfmpegProcess.prototype.protoInit === 'undefined') {
    FfmpegProcess.prototype.protoInit = true;
    Object.setPrototypeOf(FfmpegProcess.prototype, Events.prototype);
    config          = this.factory.createConfig();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);
  }
};

FfmpegProcess.prototype.setCommand = function(command) {
  this.command = command;
};

FfmpegProcess.prototype.getCommand = function() {
  return this.command;
};

FfmpegProcess.prototype.execute = function() {
  var ffmpegPath = config.getConfig() ? config.getConfig().external.ffmpeg : undefined;

  this.ffmpeg = Spawn(ffmpegPath ? ffmpegPath : "ffmpeg", this.command);
  log.info(`Spawned child pid: ${this.ffmpeg.pid}`, this.command);

  this.ffmpeg.on('exit', function(data) {
    this.emit('exit', data);
  }.bind(this));

  this.ffmpeg.stderr.on('data', function(data) {
    dur = DUR_REG.exec(data.toString('utf8'));
    cur = CUR_REG.exec(data.toString('utf8'));
    this.emit('data', this.ffmpeg.pid,
      cur && cur.length > 0 ? cur[0] : null,
      dur && dur.length > 0 ? dur[0] : null);
  }.bind(this));

  this.ffmpeg.stderr.on('error', function(data) {
    this.emit('error', this.ffmpeg.pid, data.toString('utf8'));
  }.bind(this));

  this.emit('start', this.ffmpeg.pid);
};

FfmpegProcess.prototype.cancel = function() {
  try {
    this.ffmpeg.kill();
  } catch(e) {
    log.error(e);
  }
};

module.exports = FfmpegProcess;
