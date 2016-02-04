var fs   = require('fs');
const EventEmitter  = require('events');

const eventEmitter = new EventEmitter();

var queue   = null;
var index   = 0;

eventEmitter.on('clearedItem', function() {
  if(queue) {
    index++;

    if(index >= queue.length) {
      queue   = null;
      index   = 0;
    }
  }
});

function VideoStream(){};

//Adjust to take requests with manifest file included
VideoStream.read = function(request, path, options, callback) {
  console.log("server-loadMeta");
  var readStream  = fs.createReadStream(path, options);
  var blob = null;

  readStream.on('readable', function() {
    readStream.pipe(blob);
  });
  readStream.on('error', function(e) {
    console.log("Server: Error: " + e);
  });
  readStream.on('close', function() {
    console.log("Server: Finished reading stream");
    callback(request, blob);
    eventEmitter.emit('clearedItem');
  });
};

VideoStream.queuedRead = function(request, readConfigs, callback) {
  if(queue == null){
    gueue = readConfigs;

    for(var readConfig in readConfigs) {
      VideoStream.read(request, readConfig.path, readConfig.options, readConfig.callback);
    }
  }
}

VideoStream.readChunk = function(request) {
  console.log("server-readChunk");
  var options     = {start: parseInt(request.data.segment.start), end: parseInt(request.data.segment.end)};
  var readStream  = fs.createReadStream(request.data.path, options);

  readStream.on('readable', function() {
    request.socket.emit('file-segment', readStream.read());
  });
  readStream.on('error', function(e) {
    console.log("Server: Error: " + e);
  });
  readStream.on('close', function() {
    request.socket.emit('video-segment');
    console.log("Server: Finished reading stream");
  });
};

VideoStream.readFile = function(request, stream) {
	var readStream = fs.createReadStream(request.data.path);

  readStream.on('readable', function() {
    request.socket.emit('file-segment', readStream.read());
  });
	readStream.on('error', function(e) {
		console.log("Server: Error: " + e);
	});
  readStream.on('close', function() {
    request.socket.emit('load_file');
		console.log("Server: Finished reading file");
	});
};

module.exports = VideoStream;
