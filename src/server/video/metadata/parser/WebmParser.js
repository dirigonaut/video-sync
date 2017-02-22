var Fs      = require('fs');
var Ebml    = require('ebml');
var LogManager = require('../../../log/LogManager');

const Util = require('util');
const EventEmitter = require('events');

var log = LogManager.getLog(LogManager.LogEnum.ENCODING);

function WebmParser() {
  EventEmitter.call(this);
}

Util.inherits(WebmParser, EventEmitter);

WebmParser.prototype.queuedDecode = function(metaRequests) {
  console.log("WebmParser.queuedDecode");
  var emitter = this;
  var counter = new EventEmitter();
  counter.queue = metaRequests.length - 1;

  counter.on('processed', function(manifest) {
    if(this.queue > 0) {
      --this.queue;
    } else {
      emitter.emit('end');
    }
  });

  for(var i in metaRequests) {
    this.readAndDecode(metaRequests[i].readConfig, metaRequests[i].manifest, counter);
  }
};

//Adjust to take requests with manifest file included
WebmParser.prototype.readAndDecode = function(readConfig, manifest, counter) {
  console.log("WebmParser.readAndDecode");
  var readStream  = Fs.createReadStream(readConfig.path, readConfig.options);
  var decoder     = new Ebml.Decoder();

  readStream.on('data', function(data) {
    decoder.write(data);
  });
  readStream.on('error', function(e) {
    console.log("WebmParser.readAndDecode, Server: Error: " + e);
  });
  readStream.on('end', function() {
    console.log("WebmParser.readAndDecode, Server: Finished reading stream");
    counter.emit('processed', manifest);
  });

  decoder.on('data', function(data) {
    readConfig.callback(manifest, data);
  });
};

module.exports = WebmParser;
