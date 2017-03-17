var Fs          = require('fs');
var LogManager  = require('../log/LogManager');

var log = LogManager.getLog(LogManager.LogEnum.UTILS);

function FileIO() {
};

FileIO.prototype.read = function(readConfig) {
  log.debug('FileIO.read', readConfig);
  var readStream  = Fs.createReadStream(readConfig.path, readConfig.options);

  readStream.on('error', function(e) {
    log.error("FileIO.write, Server: Error: " + e);
  });

  readStream.on('close', function() {
    log.debug("FileIO.read, Server: Finished reading.");
    if(readConfig.onFinish) {
      readConfig.onFinish();
    }
	});

  readStream.on('data', function(chunk) {
    log.silly("on data", readConfig);
    readConfig.callback(chunk);
  });
};

FileIO.prototype.write = function(writeConfig, data) {
  log.debug('FileIO.write', writeConfig);
	var writeStream = Fs.createWriteStream(writeConfig.path, writeConfig.options);

  writeStream.on('error', function(e) {
		log.error("FileIO.write, Server: Error: " + e);
	});
  writeStream.on('close', function() {
		log.debug("FileIO.write, Server: Finished writing file");
    if(readConfig.onFinish) {
      writeConfig.onFinish();
    }
	});

  writeStream.write(data);
};

FileIO.prototype.readDir = function(readConfig) {
  log.debug('FileIO.readDir', readConfig);

  Fs.readdir(readConfig.path, function (err, files) {
    if (err) {
      log.error("FileIO.write, Server: Error:", err);
    }

    var mpdFiles = [];
    for(var x = 0; x < files.length; ++x) {
      var splitExt = files[x].split(".");
      var splitPath = splitExt[0].split("_");

      var extension = splitExt[splitExt.length - 1];
      var type = splitPath[splitPath.length - 1];
      if(extension == "mpd") {
        var file = new Object();
        file.path = readConfig.path + files[x];
        file.type = type;
        mpdFiles.push(file);
      }
    }

    for(x in mpdFiles){
      readConfig.callback(mpdFiles[x]);
    }
  });
};

FileIO.prototype.ensureDirExists = function(path, mask, callback) {
  log.debug('FileIO.ensureDirExists', path);

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

FileIO.prototype.dirExists = function(path, callback) {
  log.debug('FileIO.dirExists', path);
  var isDir = true;

  Fs.stat(path, function(err, stats) {
    if (err) {
      log.error('FileIO.dirExists err', err);
      isDir = false;
    } else if(!stats.isDirectory()) {
      log.error('FileIO.dirExists is not dir', path);
      isDir = false;
    }

    if(isDir) {
      callback();
    }
  });
}

FileIO.prototype.createStreamConfig = function(path, callback) {
  log.debug('FileIO.streamConfig');
  var streamConfig = new Object();
  streamConfig.path = path;
  streamConfig.options = null;
  streamConfig.callback = callback;
  streamConfig.onFinish = null;

  return streamConfig;
};

FileIO.createStreamConfig = function(path, callback) {
  log.debug('FileIO.streamConfig');
  var streamConfig = new Object();
  streamConfig.path = path;
  streamConfig.options = null;
  streamConfig.callback = callback;
  streamConfig.onFinish = null;

  return streamConfig;
};

module.exports = FileIO;
