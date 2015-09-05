var ffmpeg  = require('fluent-ffmpeg');
var fs 			= require('fs');

//Line up proper function calls
function webm(command) {
  command
  .format('webm')
  .videoBitrate('1024k')
  .videoCodec('libvpx')
  .size('720x?')
  .audioBitrate('128k')
  .audioCodec('libvorbis');
}

function find_codec(codec){
  switch(codec) {
      case "webm":
        console.log("Using webm codec.");
        return webm;
      default:
      console.log("Using default codec.");
        return webm;
  }
}

function swap_file_type(path, file_type){
  return path.split(".")[0] + "." + file_type;
}

var path;
var start_time;
var encoding;

function video_stream(){
	this.debug = true;
};

video_stream.prototype.load_video = function(data) {
	path = data.path;
  start_time = data.start;
  encoding = data.encoding;
};

video_stream.prototype.encode = function(data) {
  var new_path = swap_file_type(data.path, data.encoding);

	new ffmpeg(data.path)
  .preset(find_codec(data.encoding))
  .on('start', function(commandLine){
    console.log("Hold on to your butts: " + commandLine);
  })
  .on('end', function() {
    console.log('file has been converted succesfully');
  })
  .on('error', function(err) {
    console.log('an error happened: ' + err.message);
  })
  .on('progress', function(progress) {
    console.log('Processing: ' + progress.percent + '% done');
  })
  .save(new_path);
};

video_stream.prototype.stream = function(socket, player) {
  ffmpeg.ffprobe(path, function(err, metadata) {
    if(metadata){
      var read_stream = fs.createReadStream(path, {start:start_time, end:metadata.format.size});

      read_stream.on('readable', function() {
        socket.emit('video-packet', read_stream.read());
      });
      read_stream.on('error', function(e) {
        console.log("Error: " +e);;
      });
      read_stream.on('close', function(e) {
        console.log("Closed: " +e);;
      });
    }
  });
};

video_stream.prototype.encode_stream = function(socket, codec, start, end) {
  //var command = new ffmpeg(path);
  //.preset(webm)
  /*.on('end', function() {
    console.log('file has been converted succesfully');
  })
  .on('error', function(err) {
    console.log('an error happened: ' + err.message);
  });

  var ffstream = command.pipe();
  ffstream.on('data', function(chunk) {
    console.log('ffmpeg just wrote ' + chunk.length + ' bytes');
  });*/
};

module.exports = video_stream;
