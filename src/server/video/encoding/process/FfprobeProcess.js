const EventEmitter  = require('events');
const Util = require('util');

var Spawn = require('child_process').spawn;
var Split = require('split');

function FfprobeProcess() { }

Util.inherits(FfprobeProcess, EventEmitter);

FfprobeProcess.prototype.process = function(path) {
  var self = this;

  var options = FfprobeProcess.COMMAND;
  options[0] = path;

  var ffprobe = Spawn("ffprobe", options);
  console.log(`Spawned child pid: ${ffprobe.pid}`);

  var default_events = ['message', 'error', 'exit', 'close', 'disconnect'];
  default_events.forEach(function(event) {
      ffprobe.on(event, self.emit(event));
  });

  // We also need to pass `stdout` data to a function that will
  // filter and emit `progress` events.
  ffprobe.stdout.on('data', function(data) {
    self.emit(data);
  });

  this.emit('start');
}

module.exports = FfprobeProcess;

FfprobeProcess.COMMAND = ['', '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', '-show_packets'];

var handleOutput = function(data) {
  console.log(data);
}
