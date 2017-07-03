const Promise   = require('bluebird');
const Cluster   = require('cluster');
const Path      = require('path');
const Fs        = Promise.promisifyAll(require('fs'));

const CONFIG_NAME     = "config.json";
const CONFIG_NAME_OS  = `config.${process.platform}.json`;

const REDIS_CONFIG    = "redis.conf";
const REDIS_CONFIG_OS = `redis.${process.platform}.conf`;

const CERTIFICATE     = "certificate.pem"

const ROOT_DIR    = Path.join(__dirname, "../../../");
const CONFIG_DIR  = Path.join(ROOT_DIR, "configs");
const APP_DATA    = Path.join(process.env.APPDATA || Path.join(process.env.HOME,
  (process.platform == 'darwin' ?  Path.join('Library', 'Preferences') : '.config')), 'video-sync');
const LOG_DIR     = Path.join(APP_DATA, "logs");

var fileIO, config;

function Config() { }

Config.prototype.initializeAsync = Promise.coroutine(function* () {
  if(typeof Config.prototype.protoInit === 'undefined') {
    //Must happen first otherwise infinite recursion happens
    Config.prototype.protoInit = true;

    fileIO = this.factory.createFileIO();

    if(Cluster.isMaster) {
      yield setupAppDataDir.call(this);
    }

    config = yield loadConfig();
  }
});

Config.prototype.getConfig = function() {
  return config;
};

Config.prototype.getRedisConfigPath = function() {
  return Path.join(APP_DATA, REDIS_CONFIG);
};

Config.prototype.getCertificatePath = function() {
  return Path.join(APP_DATA, CERTIFICATE);
};

Config.prototype.getAppDataDir = function() {
  return APP_DATA;
};

Config.prototype.getLogDir = function() {
  return LOG_DIR;
};

module.exports = Config;

var loadConfig = Promise.coroutine(function* () {
  var binaryConfig = yield Fs.readFileAsync(Path.join(APP_DATA, CONFIG_NAME));

  if(binaryConfig) {
    config = JSON.parse(binaryConfig);
  }

  return config;
});

var setupAppDataDir = Promise.coroutine(function* () {
  var fileIO = this.factory.createFileIO();

  yield fileIO.ensureDirExistsAsync(APP_DATA, 484);

  yield ensureAssetExists.call(this, REDIS_CONFIG, REDIS_CONFIG_OS, "conf");
  yield ensureAssetExists.call(this, CONFIG_NAME, CONFIG_NAME_OS, "json");

  yield fileIO.ensureDirExistsAsync(LOG_DIR, 484);
});

var ensureAssetExists = Promise.coroutine(function* (name, pattern, extType) {
  var fileExists;
  var fileIO = this.factory.createFileIO();

  var files = yield fileIO.readDirAsync(APP_DATA, extType);

  if(typeof files !== 'undefined' && files) {
    for(let i = 0; i < files.length; ++i) {
      if(files[i].includes(name)) {
        fileExists = true;
        break;
      }
    }
  }

  if(typeof fileExists === 'undefined' || !fileExists) {
    var binaryData = yield Fs.readFileAsync(Path.join(CONFIG_DIR, pattern));
    fileExists = yield Fs.writeFileAsync(Path.join(APP_DATA, name), binaryData);
  }

  return fileExists;
});
