const Promise = require('bluebird');
const Events  = require('events');
const Util    = require('util');

const Spawn = require('child_process').spawn;

var log;

function FfmpegProcess() { }

FfmpegProcess.prototype.initialize = function(force) {
  if(typeof FfmpegProcess.prototype.protoInit === 'undefined') {
    FfmpegProcess.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ENCODING);
  }

  if(force === undefined ? typeof FfmpegProcess.prototype.stateInit === 'undefined' : force) {
    FfmpegProcess.prototype.stateInit = true;
    Object.setPrototypeOf(FfmpegProcess.prototype, Events.prototype);
  }
};

FfmpegProcess.prototype.setCommand = function(command) {
  this.command = command;
};

FfmpegProcess.prototype.execute = function() {
  var ffmpeg = Spawn("ffmpeg", this.command);
  log.info(`Spawned child pid: ${ffmpeg.pid}`, this.command);

  //var processEvents = ['beforeExit', 'disconnect', 'exit', 'message'];
  //var streamEvents = ['close', 'data', 'end', 'error', 'readable'];

  ffmpeg.on('exit', function(data) {
    this.emit('exit', data);
    console.log('ffmpeg.on(exit): ' + data.toString('utf8'));
  }.bind(this));

  ffmpeg.stderr.on('data', function(data) {
    this.emit('error', data.toString('utf8'))
    console.log('ffmpeg.stderr.on(data): ' + data.toString('utf8'));
  }.bind(this));

  ffmpeg.stdout.on('data', function(data) {
    this.emit('data', data.toString('utf8'));
    console.log('ffmpeg.stdout.on(data): ' + data.toString('utf8'));
  }.bind(this));

  this.emit('start');

  return new Promise(function(resolve, reject) {
    this.once('exit', function(code) {
      if(code === 0) {
        resolve(code);
      } else {
        reject(code);
      }
    });
  }.bind(this));
};

module.exports = FfmpegProcess;
