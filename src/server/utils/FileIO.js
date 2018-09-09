const Promise     = require('bluebird');
const Fs          = Promise.promisifyAll(require('fs'));
const Path        = require('path');

const DIR_MASK = 464;

var log;

function FileIO() { }

FileIO.prototype.initialize = function(init) {
  if(typeof FileIO.prototype.protoInit === 'undefined' && typeof init !== 'undefined' ? init : true) {
    FileIO.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.UTILS);
  }
};

FileIO.prototype.read = function(path, options, onData, onFinish) {
  log.debug('FileIO.read', path);
  var readStream  = Fs.createReadStream(path, options);
  var index = 0;

  readStream.on('error', function(e) {
    log.error("FileIO.read, Server: Error: " + e);
  });

  readStream.on('close', function() {
    log.debug("FileIO.read, Server: Finished reading.");
    if(onFinish) {
      onFinish(index);
    }
	});

  readStream.on('data', function(chunk) {
    onData(chunk, index);
    index += 1;
  });
};

FileIO.prototype.readDirAsync = Promise.coroutine(function* (path, extType) {
  FileIO.prototype.protoInit ? log.debug('FileIO.readDirAsync ' + path + ' ' + extType)
                             : console.log('FileIO.readDirAsync ' + path + ' ' + extType);
  var files = yield Fs.readdirAsync(path);

  var matchingFiles = [];
  if(typeof files !== 'undefined' && files) {
    for(let i = 0; i < files.length; ++i) {
      if(!extType || Path.extname(files[i]).includes(extType)) {
        matchingFiles.push(files[i]);
      }
    }
  }

  return matchingFiles;
});

FileIO.prototype.isDir = Promise.coroutine(function* (path) {
  var stats = yield Fs.statAsync(path);
  return stats.isDirectory();
});

FileIO.prototype.ensureDirExistsAsync = function(path, mask) {
  FileIO.prototype.protoInit ? log.debug('FileIO.ensureDirExistsAsync', arguments)
                             : console.log('FileIO.ensureDirExistsAsync', arguments);
  if(!mask) {
    mask = DIR_MASK;
  }

  return new Promise(Promise.coroutine(function* (resolve, reject) {
    var splitDir = path.split(Path.sep);
    splitDir[0] = Path.sep;
    for(var i = 0; i <= splitDir.length; ++i) {
      yield Fs.mkdirAsync(Path.join.apply(null, splitDir.slice(0,i)), mask)
        .catch(function(err) {
          if (err.code !== 'EEXIST') {
            reject(new Error(err));
          }
      });
    }

   resolve();
 }));
};

FileIO.prototype.dirExists = function(path) {
  log.debug('FileIO.dirExists', path);
  return Fs.statAsync(path).then(function(stats) {
    var isDir = false;

    if(stats.isDirectory()) {
      isDir = true;
    } else {
      log.error('FileIO.dirExists is not dir', path);
    }

    return isDir;
  }).catch(function(err) {
    log.error('FileIO.dirExists is not dir', path);

    return false;
  });
};

module.exports = FileIO;
