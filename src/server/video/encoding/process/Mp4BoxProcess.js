const EventEmitter  = require('events');
const Util = require('util');

var Spawn = require('child_process').spawn;
var Split = require('split');

function Mp4BoxProcess(command) {
  this.command = command;
}

Util.inherits(Mp4BoxProcess, EventEmitter);

Mp4BoxProcess.prototype.process = function() {
  var self = this;

  var mp4Box = Spawn("MP4Box", this.command);
  console.log(`Spawned child pid: ${mp4Box.pid}`);

  var json = "";
  mp4Box.stdout.on('data', function(data) {
    self.emit('data', data);
  });

  mp4Box.on('exit', function(data) {
    self.emit('finished');
  });

  this.emit('start');
}

module.exports = Mp4BoxProcess;
