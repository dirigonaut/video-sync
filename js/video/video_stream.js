var ffmpeg  = require('../utils/plain-ffmpeg');
var fs 			= require('fs');

function video_stream(){
	this.debug = true;
};

//Adjust to take requests with manifest file included
video_stream.prototype.stream = function(socket, player) {
  /*ffmpeg.ffprobe(path, function(err, metadata) {
    console.log(metadata);

    if(metadata){
      var read_stream = fs.createReadStream(path, {start:start_time, end:metadata.format.size});

      read_stream.on('readable', function() {
        socket.emit('video-packet', read_stream.read());
      });
      read_stream.on('error', function(e) {
        console.log("Server: Error: " +e);
      });
      read_stream.on('close', function() {
        console.log("Server: Finished reading stream");
      });
    }
  });*/
};

module.exports = video_stream;
