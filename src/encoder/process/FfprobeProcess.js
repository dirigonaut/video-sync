const Events  = require('events');
const Util    = require('util');
const Promise = require('bluebird');

const Spawn   = require('child_process').spawn;

var config, log;

function FfprobeProcess() { }

FfprobeProcess.prototype.initialize = function() {
  if(typeof FfprobeProcess.prototype.protoInit === 'undefined') {
    FfprobeProcess.prototype.protoInit = true;
    Object.setPrototypeOf(FfprobeProcess.prototype, Events.prototype);
    config          = this.factory.createConfig();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);
  }
};

FfprobeProcess.prototype.setCommand = function(command) {
  this.command = command;
};

FfprobeProcess.prototype.execute = function() {
  var ffprobePath = config.getConfig() ? config.getConfig().external.ffprobe : undefined;
  var ffprobe = Spawn(ffprobePath ? ffprobePath: 'ffprobe', this.command);
  log.info(`Spawned child pid: ${ffprobe.pid}`, this.command);

  var output = "";
  ffprobe.stdout.on('data', function(data) {
    output += data;
  }.bind(this));

  return new Promise(function(resolve, reject) {
    this.once('exit', function() {
      if(output) {
        resolve(JSON.parse(output));
      } else {
        reject(new Error('Ffprobe: No output'));
      }
    });
    this.once('error', reject);
  }.bind(this));
};

module.exports = FfprobeProcess;
