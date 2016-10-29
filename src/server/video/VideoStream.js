var Fs      = require('fs');
var Ebml    = require('ebml');
var Logger  = require('../utils/Logger');

var log = new Logger();

function VideoStream() {
};

VideoStream.prototype.read = function(readConfig) {
  console.log('VideoStream.read');
  var readStream  = Fs.createReadStream(readConfig.path, readConfig.options);

  readStream.on('close', function() {
    console.log("VideoStream.read, Server: Finished reading.");
    if(readConfig.onFinish) {
      readConfig.onFinish();
    }
	});
  readStream.on('data', function(chunk) {
    readConfig.callback(chunk);
  });
};

VideoStream.prototype.write = function(writeConfig, data) {
  console.log('VideoStream.write');
	var writeStream = Fs.createWriteStream(writeConfig.path, writeConfig.options);

  writeStream.on('error', function(e) {
		console.log("VideoStream.write, Server: Error: " + e);
	});
  writeStream.on('close', function() {
		console.log("VideoStream.write, Server: Finished writing file");
    if(readConfig.onFinish) {
      writeConfig.onFinish();
    }
	});

  writeStream.write(data);
};

VideoStream.prototype.readDir = function(readConfig) {
  console.log('VideoStream.readDir');
  Fs.readdir(readConfig.path, function (err, files) {
    if (err) {
      console.log(err);
    }

    var mpdFiles = [];
    for(var x = 0; x < files.length; ++x) {
      var splitPath = files[x].split(".");
      var extension = splitPath[splitPath.length - 1];
      if(extension == "json") {
        var file = new Object();
        file.path = readConfig.path + files[x];
        file.type = 'webm';
        mpdFiles.push(file);
      }
    }

    for(x in mpdFiles){
      readConfig.callback(mpdFiles[x]);
    }
  });
};

VideoStream.prototype.ensureDirExists = function(path, mask, callback) {
  Fs.mkdir(path, mask, function(err) {
    if (err) {
      if (err.code == 'EEXIST') {
        callback(true);
      } else {
        callback(err);
      }
    } else {
      callback(true);
    }
  });
}

VideoStream.prototype.createStreamConfig = function(path, callback) {
  console.log('VideoStream.streamConfig');
  var streamConfig = new Object();
  streamConfig.path = path;
  streamConfig.options = null;
  streamConfig.callback = callback;
  streamConfig.onFinish = null;

  return streamConfig;
};

VideoStream.createStreamConfig = function(path, callback) {
  console.log('VideoStream.streamConfig');
  var streamConfig = new Object();
  streamConfig.path = path;
  streamConfig.options = null;
  streamConfig.callback = callback;
  streamConfig.onFinish = null;

  return streamConfig;
};

module.exports = VideoStream;
