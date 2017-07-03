const Promise     = require('bluebird');
const Fs          = Promise.promisifyAll(require('fs'));
const Path        = require('path');

var log;

function FileIO() { }

FileIO.prototype.initialize = function(force) {
  if(typeof FileIO.prototype.protoInit === 'undefined') {
    FileIO.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.UTILS);
  }
};

FileIO.prototype.read = function(readConfig) {
  log.debug('FileIO.read', readConfig);
  var readStream  = Fs.createReadStream(readConfig.path, readConfig.options);
  var index = 0;

  readStream.on('error', function(e) {
    log.error("FileIO.read, Server: Error: " + e);
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
	}.bind(this));

  writeStream.on('finish', function() {
		log.debug("FileIO.write, Server: Finished writing file");
    if(writeConfig.onFinish) {
      writeConfig.onFinish();
    }
	}.bind(this));

  writeStream.write(data);
};

FileIO.prototype.readDir = function(readConfig, extType) {
  log.debug('FileIO.readDir', readConfig);

  Fs.readdir(readConfig.path, function (err, files) {
    if (err) {
      log.error("FileIO.write, Server: Error:", err);
    }

    var matchingFiles = [];
    if(extType) {
      for(var x = 0; x < files.length; ++x) {
        if(Path.extname(files[x]).includes(extType)) {
          matchingFiles.push(files[x]);
        }
      }
    } else {
      matchingFiles = files;
    }

    readConfig.callback(matchingFiles);
  }.bind(this));
};

FileIO.prototype.readDirAsync = Promise.coroutine(function* (path, extType) {
  log.debug('FileIO.readDirAsync ' + path + ' ' + extType);
  var files = yield Fs.readdirAsync(path);

  var matchingFiles = [];
  if(typeof files !== 'undefined' && files) {
    for(let i = 0; i < files.length; ++i) {
      if(Path.extname(files[i]).includes(extType)) {
        matchingFiles.push(files[i]);
      }
    }
  }

  return matchingFiles;
});

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

    if(callback) {
      callback(result);
    }
  }.bind(this));
}

FileIO.prototype.ensureDirExistsAsync = Promise.coroutine(function* (path, mask) {
  log.debug('FileIO.ensureDirExistsAsync', path);

  yield Fs.mkdirAsync(path, mask)
  .catch(function(err) {
      if (err.code !== 'EEXIST') {
        throw new Error(err);
      }
    });
});

FileIO.prototype.dirExists = function(path) {
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
  });

  return isDir;
}

FileIO.prototype.createStreamConfig = function(path, callback) {
  log.debug('FileIO.streamConfig');

  var streamConfig = {};
  streamConfig.path = path;
  streamConfig.options = {};
  streamConfig.callback = callback;
  streamConfig.onFinish = null;

  return streamConfig;
};

FileIO.createStreamConfig = function(path, callback) {
  log.debug('FileIO.streamConfig');
  var streamConfig = {};
  streamConfig.path = path;
  streamConfig.options = {};
  streamConfig.callback = callback;
  streamConfig.onFinish = null;

  return streamConfig;
};

module.exports = FileIO;
