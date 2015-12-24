var fs    = require('fs');

function VideoStream(){
};

//Adjust to take requests with manifest file included
VideoStream.stream = function(request) {
  var segSpan = {start: parseInt(request.data.start), end: parseInt(request.data.end)};
  var readStream = fs.createReadStream("/home/sabo-san/Development/video-sync-2.0/html/" + request.data.path, segSpan);

  readStream.on('readable', function() {
    request.socket.emit('video-segment', readStream.read());
  });
  readStream.on('error', function(e) {
    console.log("Server: Error: " +e);
  });
  readStream.on('close', function() {
    console.log("Server: Finished reading stream");
  });
};

VideoStream.readFile = function(request, stream) {
	var readStream = fs.createReadStream(request.data.path);

  readStream.on('readable', function() {
    request.socket.emit('file-segment', readStream.read());
  });
	readStream.on('error', function(e) {
		console.log("Server: Error: " +e);
	});
  readStream.on('close', function() {
    request.socket.emit('load_file');
		console.log("Server: Finished reading file");
	});
};

module.exports = VideoStream;
