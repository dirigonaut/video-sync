const Promise = require('bluebird');
const Events  = require('events');
const Util    = require('util');

const Spawn = require('child_process').spawn;
const Split = require('split');

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
  log.info(`Spawned child pid: ${ffmpeg.pid}`);

  var defaultEvents = ['message', 'error', 'exit', 'close', 'disconnect'];

  defaultEvents.forEach(function(event) {
    ffmpeg.on(event, function(data) {
      this.emit(event, data);
    }.bind(this));
  }.bind(this));

  var handleInfo = function(line) {
    var line = line.trim();
    if (line.substring(0, 5) === 'frame') {
      this.emit('data', parseProgress(line));
    }
  }.bind(this);

  ffmpeg.stderr.pipe(Split(/[\r\n]+/)).on('data', handleInfo);

  ffmpeg.stdout.on('data', function(data) {
    this.emit('data', data);
  }.bind(this));

  this.emit('start');

  return new Promise(function(resolve, reject) {
    this.once('close', resolve);
    this.once('error', reject);
  }.bind(this));
};

module.exports = FfmpegProcess;

var parseProgress = function(line) {
    var progressValues = line.match(/[\d.:]+/g)

    var progress = {
        frame:      progressValues[0],
        fps:        progressValues[1],
        targetSize: progressValues[3],
        timeMark:   progressValues[4],
        kbps:       progressValues[5] || 0,
    };

    return progress;
};

var parseInputProperties = function(line) {
    var values = line.match(/[\d.:]+/g).filter(function(val) {
        return val !== ':';
    });

    var properties = {
        duration:      values[0],
        bitrate_kbps:  values[2]
    }

    return properties;
};
