const Events  = require('events');
const Util = require('util');
const Promise = require('bluebird');

var Spawn = require('child_process').spawn;
var Split = require('split');

class FfprobeProcess extends Events { }

FfprobeProcess.prototype.process = function(command) {
  var ffprobe = Spawn('ffprobe', command);
  console.log(`Spawned child pid: ${ffprobe.pid}`);

  var default_events = ['message', 'error', 'exit', 'close', 'disconnect'];

  default_events.forEach(function(event) {
    ffprobe.on(event, function(data) {
      this.emit(event, data);
    }.bind(this));
  }.bind(this));

  var output = "";
  ffprobe.stdout.on('data', function(data) {
    output += data;
  }.bind(this));

  return new Promise(function(resolve, reject) {
    this.once('close', function() {
      if(output) {
        output = output.toString().replace(/\[\/*[A-Z]*\]/g, '').trim();
        var json = '{' + output.replace(/\n/g, ', ').replace(/=/g, ': ') + '}';
        resolve(JSON.stringify(json));
      } else {
        reject(new Error('FFprobe: No output'));
      }
    });
    this.once('error', reject);
  }.bind(ffprobe));
};

module.exports = FfprobeProcess;
