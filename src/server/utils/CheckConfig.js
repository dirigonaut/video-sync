const Promise = require('bluebird');
const Exec    = require('child_process').exec;

var config;

function CheckConfig() { };

CheckConfig.prototype.initialize = function() {
  if(typeof CheckConfig.prototype.protoInit === 'undefined') {
    CheckConfig.prototype.protoInit = true;
    config          = this.factory.createConfig();
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
  return asyncPromise(exec).catch(function(error) {
    throw new Error(`Calling process redis-server returned error: ${error}`);
  });
};

var validateFFmpeg = function() {
  var exec = Exec(`${config.getConfig().ffmpeg ? config.getConfig().ffmpeg : 'ffmpeg'} -version`);
  return asyncPromise(exec).catch(function(error) {
    throw new Error(`Calling process ffmpeg returned error: ${error}`);
  });
};

var validateFFprobe = function() {
  var exec = Exec(`${config.getConfig().ffprobe ? config.getConfig().ffprobe : 'ffprobe'} -version`);
  return asyncPromise(exec).catch(function(error) {
    throw new Error(`Calling process ffprobe returned error: ${error}`);
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

    var remote = config.getConfig().videoSyncInfo.allowRemoteAdmin;
    if(remote && typeof remote === 'boolean') {
      throw new Error('The videoSyncInfo.allowRemoteAdmin needs to be a boolean value in your config.');
    }

    return new Promise.resolve();
  } catch(e) {
    return new Promise.reject(e);
  }
};

var validateCertificateInfo = function() {
  try {
    if(!config.getConfig().certificate) {
      throw new Error('The certificate map is not in your config.');
    }

    if(!config.getConfig().certificate.path && !config.getConfig().certificate.attributes) {
      throw new Error('The certificate map needs to provide either a set of attributes to generate a https certificate or a path to a valid certificate.');
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
