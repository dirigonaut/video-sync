const Events  = require('events');
const Util = require('util');
const Promise = require('bluebird');

var Spawn = require('child_process').spawn;
var Split = require('split');

const REGEXP_SPLIT = '[\\/[A-Z]*]([a-z\\s\\S]*?)[\\/[A-Z]*]';
const REGEX_FIND_HEADERS = '[[A-Z]*]';
const REGEX_REMOVE_HEADERS = '\\[\\/*[A-Z]*\\]';

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
        resolve(format(output, REGEXP_SPLIT));
      } else {
        reject(new Error('FFprobe: No output'));
      }
    });
    this.once('error', reject);
  }.bind(ffprobe));
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
