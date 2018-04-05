const Events  = require('events');
const Util    = require('util');
const Promise = require('bluebird');

const Spawn   = require('child_process').spawn;

const REGEXP_SPLIT = '[\\/[A-Z]*]([a-z\\s\\S]*?)[\\/[A-Z]*]';
const REGEX_FIND_HEADERS = '[[A-Z]*]';
const REGEX_REMOVE_HEADERS = '\\[\\/*[A-Z]*\\]';

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
  if(!this.command) {
    throw new Error('FfprobeProcess this.command is not set.');
  }

  var ffprobePath = config.getConfig() ? config.getConfig().ffprobePath : undefined;
  var ffprobe = Spawn(ffprobePath ? ffprobePath: 'ffprobe', this.command);
  log.info(`Spawned child pid: ${ffprobe.pid}`, this.command);

  var defaultEvents = ['message', 'error', 'exit', 'close', 'disconnect'];

  defaultEvents.forEach(function(event) {
    ffprobe.on(event, function(data) {
      this.emit(event, data);
    }.bind(this));
  }.bind(this));

  var output = "";
  ffprobe.stdout.on('data', function(data) {
    output += data;
  }.bind(this));

  return new Promise(function(resolve, reject) {
    this.once('exit', function() {
      if(output) {
        resolve(format(output, REGEXP_SPLIT));
      } else {
        reject(new Error('Ffprobe: No output'));
      }
    });
    this.once('error', reject);
  }.bind(this));
};

module.exports = FfprobeProcess;

function format(input, regex) {
  var regExp = new RegExp(regex, 'gm');
  var jsonResults = { stream : [], format: [] };
  var parsed;

  while((parsed = regExp.exec(input.toString()))) {
    var json = toJSON(parsed.toString());
    if(json) {
      if(jsonResults[json.key.substring(1, json.key.length - 1).toLowerCase()]) {
        jsonResults[json.key.substring(1, json.key.length - 1).toLowerCase()].push(json.value);
      }
    }
  }

  return jsonResults;
}

function toJSON(input) {
  var result;
  var regExp = new RegExp(REGEX_FIND_HEADERS);
  var parsed = regExp.exec(input.toString());

  if(parsed) {
    var output = input.replace(/REGEX_REMOVE_HEADERS/g, '').trim();
    var json = '{' + output.replace(/\n/g, ', ').replace(/=/g, ': ') + '}';
    result = { 'key' : parsed[0], 'value' : json};
  }

  return result;
}
