const Promise = require('bluebird');
const Events  = require('events');
const Util    = require('util');

const Spawn = require('child_process').spawn;

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
  var ffmpegPath = config.getConfig() ? config.getConfig().certificate : undefined;
  this.ffmpeg = Spawn(ffmpegPath ? ffmpegPath : "ffmpeg", this.command);
  log.info(`Spawned child pid: ${this.ffmpeg.pid}`, this.command);

  this.ffmpeg.on('exit', function(data) {
    this.emit('exit', data);
  }.bind(this));

  this.ffmpeg.stderr.on('data', function(data) {
    this.emit('data', data.toString('utf8'));
  }.bind(this));

  this.emit('start');

  return new Promise(function(resolve, reject) {
    this.once('exit', function(code) {
      resolve(code);
    });
  }.bind(this));
};

FfmpegProcess.prototype.cancel = function() {
  try {
    this.ffmpeg.kill();
  } catch(e) {
    log.error(e);
    log.socket(e);
  }
};

module.exports = FfmpegProcess;
