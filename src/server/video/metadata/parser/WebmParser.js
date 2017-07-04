const Fs      = require('fs');
const Ebml    = require('ebml');
const Events  = require('events');

var log;

function WebmParser() { }

WebmParser.prototype.initialize = function(force) {
	if(typeof WebmParser.prototype.protoInit === 'undefined') {
    WebmParser.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ENCODING);
  }

  if(force === undefined ? typeof WebmParser.prototype.stateInit === 'undefined' : force) {
    WebmParser.prototype.stateInit = true;
    Object.assign(this.prototype, Events.prototype);
  }
};

WebmParser.prototype.queuedDecode = function(metaRequests) {
  log.debug("WebmParser.queuedDecode");
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
  log.debug("WebmParser.readAndDecode");
  var readStream  = Fs.createReadStream(readConfig.path, readConfig.options);
  var decoder     = new Ebml.Decoder();

  readStream.on('data', function(data) {
    decoder.write(data);
  });
  readStream.on('error', function(e) {
    log.error("WebmParser.readAndDecode, Server: Error: " + e);
  });
  readStream.on('end', function() {
    log.info("WebmParser.readAndDecode, Server: Finished reading stream");
    counter.emit('processed', manifest);
  });

  decoder.on('data', function(data) {
    readConfig.callback(manifest, data);
  });
};

module.exports = WebmParser;
