var ffmpeg  = require('../utils/plain-ffmpeg');

function encode_command(command, callback){
  this.command      = new ffmpeg(command);

  this.command.on('start', function(command_line){
    console.log("Server: Hold on to your butts: ");
    console.log(command_line);
  }).on('progress', function(percent) {
    console.log(percent);
  }).on('close', function() {
    console.log('Server: file has been converted succesfully');
    callback();
  }).on('error', function(err) {
    console.log(err);
  });
}

encode_command.prototype.run_command = function (){
  this.command.start();
};

module.exports = encode_command;
