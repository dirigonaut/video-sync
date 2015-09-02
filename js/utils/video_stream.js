var ffmpeg  = require('fluent-ffmpeg');
var fs 			= require('fs');

//Line up proper function calls
function webm(command) {
  command
  .format('webm')
  .videoCodec('libvpx')
  .size('720x?')
  .audioChannels(2)
  .audioCodec('libvorbis');
}

function swap_file_type(path, file_type){
  return path.split(".")[0] + "." + file_type;
}

var path;
var start;
var end;
var encoding;

function video_stream(){
	this.debug = true;
};

video_stream.prototype.load_video = function(data) {
	path = data.path;
  start = data.start;
  end = data.end;
  encoding = data.encoding;
};

video_stream.prototype.encode = function(data) {
  var new_path = swap_file_type(data.path, "webm");

  console.log("Hold on to your butts.");
	new ffmpeg(data.path)
  .preset(webm)
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

video_stream.prototype.stream = function(socket) {
	var read_stream = fs.createReadStream(path);

	read_stream.on('readable', function() {
		socket.emit('video-packet', read_stream.read());
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
