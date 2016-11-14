const EventEmitter  = require('events');
const Util = require('util');

var Spawn = require('child_process').spawn;
var Split = require('split');

function FfmpegProcess(command) {
  this.command = command;
}

Util.inherits(FfmpegProcess, EventEmitter);

FfmpegProcess.prototype.process = function() {
  var _this = this;

  var ffmpeg = Spawn("ffmpeg", this.command);
  console.log(`Spawned child pid: ${ffmpeg.pid}`);

  var default_events = ['message', 'error', 'exit', 'close', 'disconnect'];

  default_events.forEach(function(event) {
    ffmpeg.on(event, function(data) {
      _this.emit(event, data);
    });
  });

  var handleInfo = function(line) {
    var line = line.trim();

    if (line.substring(0, 5) === 'frame') {
      _this.emit('progress', parseProgress(line));
    }
    if (line.substring(0, 8) === 'Duration') {
      _this.emit('properties', {from: 'input', data: parseInputProperties(line)});
    }
  };

  ffmpeg.stderr.pipe(Split(/[\r\n]+/)).on('data', handleInfo);

  ffmpeg.stdout.on('data', function(data) {
    _this.emit('data', data);
  });

  this.emit('start');
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
