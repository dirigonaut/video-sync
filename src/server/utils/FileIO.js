var Fs          = require('fs');
var Path        = require('path');
var LogManager  = require('../log/LogManager');

var log = LogManager.getLog(LogManager.LogEnum.UTILS);

function FileIO() {
};

FileIO.prototype.read = function(readConfig) {
  log.debug('FileIO.read', readConfig);
  var readStream  = Fs.createReadStream(readConfig.path, readConfig.options);
  var index = 0;

  readStream.on('error', function(e) {
    log.error("FileIO.write, Server: Error: " + e);
  });

  readStream.on('close', function() {
    log.debug("FileIO.read, Server: Finished reading.");
    if(readConfig.onFinish) {
      readConfig.onFinish(index);
    }
	});

  readStream.on('data', function(chunk) {
    log.silly("on data", readConfig);
    readConfig.callback(chunk, index);
    index += 1;
  });
};

FileIO.prototype.write = function(writeConfig, data) {
  log.debug('FileIO.write', writeConfig);
	var writeStream = Fs.createWriteStream(writeConfig.path, writeConfig.options);

  writeStream.on('error', function(e) {
		log.error("FileIO.write, Server: Error: " + e);
	});

  writeStream.on('finish', function() {
		log.debug("FileIO.write, Server: Finished writing file");
    if(writeConfig.onFinish) {
      writeConfig.onFinish();
    }
	});

  writeStream.write(data);
};

FileIO.prototype.readDir = function(readConfig, extType) {
  log.debug('FileIO.readDir', readConfig);

  Fs.readdir(readConfig.path, function (err, files) {
    if (err) {
      log.error("FileIO.write, Server: Error:", err);
    }

    var matchingFiles = [];
    if(extType !== undefined && extType !== null) {
      for(var x = 0; x < files.length; ++x) {
        if(Path.extname(files[x]).includes(extType)) {
          matchingFiles.push(files[x]);
        }
      }
    } else {
      matchingFiles = files;
    }

    for(var i in matchingFiles) {
      readConfig.callback(matchingFiles[i]);
    }

    readConfig.callback(null);
  });
};

FileIO.prototype.ensureDirExists = function(path, mask, callback) {
  log.debug('FileIO.ensureDirExists', path);

  Fs.mkdir(path, mask, function(err) {
    var result;

    if (err) {
      if (err.code == 'EEXIST') {
        result = true;
      } else {
        log.error(err);
      }
    } else {
      result = true;
    }

    if(callback !== undefined && callback !== null) {
      callback(result);
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
