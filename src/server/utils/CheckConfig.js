const Promise = require('bluebird');
const Exec    = require('child_process').exec;

var config;

function CheckConfig() { };

CheckConfig.prototype.initialize = function() {
  if(typeof CheckConfig.prototype.protoInit === 'undefined') {
    CheckConfig.prototype.protoInit = true;
    config = this.factory.createConfig();
  }
};

CheckConfig.prototype.validateConfig = function() {
  return Promise.all([validateRedis(),
                      validateFFmpeg(),
                      validateFFprobe(),
                      validateRedisInfo(),
                      validateHostInfo(),
                      validateCertificateInfo()]);
};

module.exports = CheckConfig;

var validateRedis = function() {
  var exec = Exec(`${config.getConfig().redis ? config.getConfig().redis : 'redis-server'} --version`);
  return asyncPromise(exec).catch(function(error, data) {
    throw new Error(`Calling process redis-server: ${error}`);
  });
};

var validateFFmpeg = function() {
  var exec = Exec(`${config.getConfig().ffmpeg ? config.getConfig().ffmpeg : 'ffmpeg'} -version`);
  return asyncPromise(exec).catch(function(error) {
    throw new Error(`Calling process ffmpeg: ${error}`);
  });
};

var validateFFprobe = function() {
  var exec = Exec(`${config.getConfig().ffprobe ? config.getConfig().ffprobe : 'ffprobe'} -version`);
  return asyncPromise(exec).catch(function(error) {
    throw new Error(`Calling process ffprobe: ${error}`);
  });
};

var validateRedisInfo = function() {
  try {
    if(!config.getConfig().redisInfo) {
      throw new Error('The redisInfo map is not in your config.');
    }

    if(!config.getConfig().redisInfo.host) {
      throw new Error('The redisInfo.host is not in your config.');
    }

    if(!config.getConfig().redisInfo.port) {
      throw new Error('The redisInfo.port is not in your config.');
    }

    return new Promise.resolve();
  } catch(e) {
    return new Promise.reject(e);
  }
};

var validateHostInfo = function() {
  try {
    if(!config.getConfig().videoSyncInfo) {
      throw new Error('The videoSyncInfo map is not in your config.');
    }

    if(!config.getConfig().videoSyncInfo.port) {
      throw new Error('The videoSyncInfo.port is not in your config.');
    }

    if(!config.getConfig().videoSyncInfo.staticDir) {
      throw new Error('The videoSyncInfo.staticDir is not in your config.');
    }

    if(!config.getConfig().videoSyncInfo.staticDir) {
      throw new Error('The videoSyncInfo.staticDir is not in your config.');
    }

    var encodedDir = config.getConfig().videoSyncInfo.encodedDir;
    if(encodedDir && encodedDir === Path.basename(encodedDir)) {
      throw new Error('The videoSyncInfo.encodedDir needs to be a path in your config.');
    }

    var rawDir = config.getConfig().videoSyncInfo.rawDir;
    if(rawDir && rawDir === Path.basename(rawDir)) {
      throw new Error('The videoSyncInfo.rawDir needs to be a path in your config.');
    }

    return new Promise.resolve();
  } catch(e) {
    return new Promise.reject(e);
  }
};

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
