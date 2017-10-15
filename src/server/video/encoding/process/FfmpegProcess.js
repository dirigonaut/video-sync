const Promise = require('bluebird');
const Events  = require('events');
const Util    = require('util');

const Spawn = require('child_process').spawn;

var log;

function FfmpegProcess() { }

FfmpegProcess.prototype.initialize = function() {
  if(typeof FfmpegProcess.prototype.protoInit === 'undefined') {
    FfmpegProcess.prototype.protoInit = true;
    Object.setPrototypeOf(FfmpegProcess.prototype, Events.prototype);
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);
  }
};

FfmpegProcess.prototype.setCommand = function(command) {
  this.command = command;
};

FfmpegProcess.prototype.execute = function() {
  var ffmpeg = Spawn("ffmpeg", this.command);
  log.info(`Spawned child pid: ${ffmpeg.pid}`, this.command);

  ffmpeg.on('exit', function(data) {
    this.emit('exit', data);
  }.bind(this));

  ffmpeg.stderr.on('data', function(data) {
    this.emit('data', data.toString('utf8'));
  }.bind(this));

  this.emit('start');

  return new Promise(function(resolve, reject) {
    this.once('exit', function(code) {
      resolve(code);
    });
  }.bind(this));
};

module.exports = FfmpegProcess;
