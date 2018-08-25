const Fs      = require('fs');
const Ebml    = require('ebml');
const Events  = require('events');

var log;

function WebmParser() { }

WebmParser.prototype.initialize = function() {
	if(typeof WebmParser.prototype.protoInit === 'undefined') {
    WebmParser.prototype.protoInit = true;
		Object.setPrototypeOf(WebmParser.prototype, Events.prototype);
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);
  }
};

WebmParser.prototype.queuedDecode = function(metaRequests) {
  log.debug("WebmParser.queuedDecode");
  var emitter = this;
  var counter = new Events();
  counter.queue = metaRequests.length - 1;

  counter.on('processed', function() {
    if(counter.queue > 0) {
      --this.queue;
    } else {
			this.removeAllListeners('processed');
			this.emit('finished')
    }
  });

	counter.once('finished', function() {
		this.emit('end');
	}.bind(this));

  for(var i in metaRequests) {
		try {
	    readAndDecode(metaRequests[i].path, metaRequests[i].onData, metaRequests[i].manifest, counter);
		} catch (e) {
			log.error(e);
		}
  }
};

module.exports = WebmParser;

//Adjust to take requests with manifest file included
var readAndDecode = function(path, onData, manifest, counter) {
  log.debug("WebmParser.readAndDecode");
  var readStream  = Fs.createReadStream(path);
  var decoder     = new Ebml.Decoder();

  readStream.on('data', function(data) {
    decoder.write(data);
  });

  readStream.on('error', function(e) {
		this.emit("WebmParser.readAndDecode, Server: Error: " + e)
  });

  readStream.on('end', function() {
    log.info("WebmParser.readAndDecode, Server: Finished reading stream");
    counter.emit('processed');
  });

  decoder.on('data', function(data) {
    onData(manifest, data);
  });
};
