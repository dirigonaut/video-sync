const Promise = require('bluebird');
const Path    = require('path');
const Exec    = require('child_process').exec;

var config, fileIO;

function CheckConfig() { };

CheckConfig.prototype.initialize = function() {
  if(typeof CheckConfig.prototype.protoInit === 'undefined') {
    CheckConfig.prototype.protoInit = true;
    config = this.factory.createConfig();
    fileIO = this.factory.createFileIO(false);
  }
};

CheckConfig.prototype.validateConfig = function() {
  return Promise.all([validateRedis(),
                      validateFFmpeg(),
                      validateFFprobe(),
                      validateRedisConnection(),
                      validateHostInfo(),
                      validateCertificateInfo()]);
};

module.exports = CheckConfig;

var validateRedis = function() {
  var exec = Exec(`${config.getConfig().external.redis ?
    config.getConfig().external.redis : 'redis-server'} --version`);
  return asyncPromise(exec).catch(function(error, data) {
    throw new Error(`Calling process redis-server: ${error}`);
  });
};

var validateFFmpeg = function() {
  var exec = Exec(`${config.getConfig().external.ffmpeg ?
    config.getConfig().external.ffmpeg : 'ffmpeg'} -version`);
  return asyncPromise(exec).catch(function(error) {
    throw new Error(`Calling process ffmpeg: ${error}`);
  });
};

var validateFFprobe = function() {
  var exec = Exec(`${config.getConfig().external.ffprobe ?
    config.getConfig().external.ffprobe : 'ffprobe'} -version`);
  return asyncPromise(exec).catch(function(error) {
    throw new Error(`Calling process ffprobe: ${error}`);
  });
};

var validateRedisConnection = function() {
  try {
    if(!config.getConfig().redisInfo.connection) {
      throw new Error('The redisInfo.connection map is not in your config.');
    }

    if(!config.getConfig().redisInfo.connection.host) {
      throw new Error('The redisInfo.connection.host is not in your config.');
    }

    if(!config.getConfig().redisInfo.connection.port) {
      throw new Error('The redisInfo.connection.port is not in your config.');
    }

    return new Promise.resolve();
  } catch(e) {
    return new Promise.reject(e);
  }
};

var validateHostInfo = Promise.coroutine(function* () {
  try {
    if(!config.getConfig().serverInfo) {
      throw new Error('The serverInfo map is not in your config.');
    }

    if(!config.getConfig().serverInfo.port) {
      throw new Error('The serverInfo.port is not in your config.');
    }

    if(!config.getConfig().serverInfo.staticDir) {
      throw new Error('The serverInfo.static is not in your config.');
    }

    if(!config.getConfig().dirs) {
      throw new Error('The dirs map is not in your config.');
    }

    var configDir = config.getConfig().dirs.configDir;
    if(configDir && configDir === Path.basename(configDir)) {
      throw new Error('The dirs.configDir needs to be a path in your config.');
    }

    var mediaDir = config.getConfig().dirs.mediaDir;
    if(encodeDir && encodeDir === Path.basename(encodeDir)) {
      throw new Error('The dirs.encodedDir needs to be a path in your config.');
    } else {
      yield fileIO.ensureDirExistsAsync(mediaDir);
    }

    var encodeDir = config.getConfig().dirs.encodeDir;
    if(encodeDir && encodeDir === Path.basename(encodeDir)) {
      throw new Error('The dirs.encodeDir needs to be a path in your config.');
    } else {
      yield fileIO.ensureDirExistsAsync(encodeDir);
    }

    var serverLogDir = config.getConfig().dirs.serverLogDir;
    if(serverLogDir && serverLogDir === Path.basename(serverLogDir)) {
      throw new Error('The dirs.serverLogDir needs to be a path in your config.');
    } else {
      yield fileIO.ensureDirExistsAsync(serverLogDir);
    }

    var encodeLogDir = config.getConfig().dirs.encodeLogDir;
    if(encodeLogDir && encodeLogDir === Path.basename(encodeLogDir)) {
      throw new Error('The dirs.encodeLogDir needs to be a path in your config.');
    } else {
      yield fileIO.ensureDirExistsAsync(encodeLogDir);
    }

    if(!config.getConfig().log) {
      throw new Error('The log map is not in your config.');
    }

    return new Promise.resolve();
  } catch(e) {
    return new Promise.reject(e);
  }
});

var validateCertificateInfo = function() {
  try {
    if(!config.getConfig().ssl) {
      throw new Error('The ssl map is not in your config.');
    }

    if(!config.getConfig().ssl.key) {
      throw new Error('The ssl map needs to contain the path to load/save your ssl key.');
    }

    if(!config.getConfig().ssl.crt) {
      throw new Error('The ssl map needs to contain the path to load/save your ssl certificate.');
    }

    return new Promise.resolve();
  } catch(e) {
    return new Promise.reject(e);
  }
};

var asyncPromise = function(exec) {
  return new Promise(function (resolve, reject) {
    exec.addListener("exit", function(data) {
      data ? reject(`${exec.spawnargs} return exit code ${data}`) : resolve();
    });
  });
};
