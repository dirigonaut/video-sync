var EncoderWrapper = require('./EncoderWrapper');

function EncodeProcess(command, callback){
  this.encode  = new EncoderWrapper(command.input);
  this.process = command.process;

  this.encode.on('start', function(command_line){
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

EncodeProcess.prototype.run_command = function (){
  this.encode.start(this.process);
};

module.exports = EncodeProcess;
