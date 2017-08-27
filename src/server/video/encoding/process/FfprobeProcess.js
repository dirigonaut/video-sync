const Events  = require('events');
const Util    = require('util');
const Promise = require('bluebird');

const Spawn   = require('child_process').spawn;
const Split   = require('split');

const REGEXP_SPLIT = '[\\/[A-Z]*]([a-z\\s\\S]*?)[\\/[A-Z]*]';
const REGEX_FIND_HEADERS = '[[A-Z]*]';
const REGEX_REMOVE_HEADERS = '\\[\\/*[A-Z]*\\]';

var log;

function FfprobeProcess() { }

FfprobeProcess.prototype.initialize = function(force) {
  if(typeof FfprobeProcess.prototype.protoInit === 'undefined') {
    FfprobeProcess.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ENCODING);
  }

  if(force === undefined ? typeof FfprobeProcess.prototype.stateInit === 'undefined' : force) {
    FfprobeProcess.prototype.stateInit = true;
		Object.setPrototypeOf(FfprobeProcess.prototype, Events.prototype);
  }
};

FfprobeProcess.prototype.setCommand = function(command) {
  this.command = command;
};

FfprobeProcess.prototype.execute = function() {
  if(!this.command) {
    throw new Error('FfprobeProcess this.command is not set.');
  }

  var ffprobe = Spawn('ffprobe', this.command);
  log.info(`Spawned child pid: ${ffprobe.pid}`);

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
      jsonResults[json.key.substring(1, json.key.length - 1).toLowerCase()].push(json.value);
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
