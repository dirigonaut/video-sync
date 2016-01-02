var fs   = require('fs');
var ebml = require('ebml');

var segmentMeta = null;

function VideoStream(){
};

VideoStream.initialize = function() {
  segmentMeta = null;
}

//Adjust to take requests with manifest file included
VideoStream.loadMeta = function(request) {
  var options     = {start: parseInt(request.data.start), end: parseInt(request.data.end)};
  var readStream  = fs.createReadStream("/home/sabo-san/Development/video-sync-2/html/" + request.data.path);
  var decoder     = new ebml.Decoder();

  decoder.on('data', function(chunk) {
      // parse and populate to segmentMeta
      console.log(chunk);
  });

  readStream.on('readable', function() {
    decoder.write(readStream.read(), request);
  });
  readStream.on('error', function(e) {
    console.log("Server: Error: " + e);
  });
  readStream.on('close', function() {
    console.log("Server: Finished reading stream");
  });
};

VideoStream.readRange = function(request) {
  var options     = {start: parseInt(request.data.start), end: parseInt(request.data.end)};
  var readStream  = fs.createReadStream("/home/sabo-san/Development/video-sync-2/html/" + request.data.path);

  readStream.on('readable', function() {
    request.socket.emit('video-segment', readStream.read());
  });
  readStream.on('error', function(e) {
    console.log("Server: Error: " + e);
  });
  readStream.on('close', function() {
    console.log("Server: Finished reading stream");
  });
};

VideoStream.readSegment = function(request) {
  var range       = VideoStream.getSegmentRange(request.data.seekTime);
  var options     = {start: parseInt(range.start), end: parseInt(range.end)};
  var readStream  = fs.createReadStream("/home/sabo-san/Development/video-sync-2/html/" + request.data.path);

  readStream.on('readable', function() {
    request.socket.emit('video-segment', readStream.read());
  });
  readStream.on('error', function(e) {
    console.log("Server: Error: " + e);
  });
  readStream.on('close', function() {
    console.log("Server: Finished reading stream");
  });
};

VideoStream.getSegmentRange = function(timestamp) {
  var segRange = null;

  segmentMeta.forEach(function(segment) {
    if(segment.timestamp < timestamp) {
      segRange = segment.range;
    }
  });

  return segRange
}

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
