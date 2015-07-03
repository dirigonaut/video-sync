var ffmpeg  = require('fluent-ffmpeg');

function video_converter(){
	this.debug = true;
};

video_converter.prototype.convert = function(file_path) {
	return new ffmpeg(file_path)
  .on('end', function() {
    if(this.debug){
      console.log('file has been converted succesfully');
    }
  })
  .on('error', function(err) {
    if(this.debug){
      console.log('an error happened: ' + err.message);
    }
  });
};

module.exports = video_converter;
