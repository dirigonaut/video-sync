var Cluster   = require('cluster');
var Path      = require('path');

var FileIO    = require("./FileIO");
var FileUtils = require('./FileSystemUtils');

const CONFIG_NAME = "config.json";
const CONFIG_NAME_OS = `config.${process.platform}.json`;

const REDIS_CONFIG = "redis.conf";
const REDIS_CONFIG_OS = `redis.${process.platform}.conf`;

const ROOT_DIR = Path.join(__dirname, "../../../");
const CONFIG_DIR = Path.join(ROOT_DIR, "configs");
const APP_DATA = Path.join(process.env.APPDATA || Path.join(process.env.HOME,
  (process.platform == 'darwin' ?  Path.join('Library', 'Preferences') : '.config')), 'video-sync');
const LOG_DIR  = Path.join(APP_DATA, "logs");

var config;

class Config { }

Config.prototype.initialize = function(callback) {
  if(Cluster.isMaster) {
    setupAppDataDir(callback);
  } else {
    var handleConfig = function(configuration) {
      config = JSON.parse(configuration);
      callback();
    }

    loadConfig(Path.join(APP_DATA, CONFIG_NAME), handleConfig);
  }
};

Config.prototype.getConfig = function() {
  return config;
};

Config.prototype.getRedisConfig = function() {
  return Path.join(APP_DATA, REDIS_CONFIG);
};

Config.prototype.getAppDataDir = function() {
  return APP_DATA;
};

Config.prototype.getLogDir = function() {
  return LOG_DIR;
};

module.exports = Config;

function setupAppDataDir(callback) {
  var fileIO = new FileIO();

  var checkAllAssets = function(exists) {
    if(exists) {
      ensureAssetExists(REDIS_CONFIG, REDIS_CONFIG_OS, "conf")();
      ensureAssetExists(CONFIG_NAME, CONFIG_NAME_OS, "json", function(configuration) {
        config = JSON.parse(configuration);
        callback();
      })();
    }
  };

  fileIO.ensureDirExists(APP_DATA, 484, checkAllAssets);
  fileIO.ensureDirExists(LOG_DIR, 484, null);
};

function loadConfig(path, callback) {
  var fileIO = new FileIO();
  var binaryData = [];

  var readStream = fileIO.createStreamConfig(path, function(data) {
    binaryData.push(data);
  });

  readStream.onFinish = function() {
    callback(Buffer.concat(binaryData));
  };

  fileIO.read(readStream)
};

function createConfig(pathFrom, pathTo, callback) {
  var saveToAppDir = function(fileData) {
    var fileIO = new FileIO();

    var writeStream = fileIO.createStreamConfig(pathTo, null);

    writeStream.onFinish = function() {
      if(callback !== undefined && callback !== null) {
        callback();
      }
    };

    fileIO.write(writeStream, fileData);
  }

  loadConfig(pathFrom, saveToAppDir);
};

function ensureAssetExists(name, pattern, extType, callback) {
  var assetFound = false;

  return function checkAssets() {
    var fileIO = new FileIO();

    var readStream = fileIO.createStreamConfig(APP_DATA, function(file) {
      if(file !== undefined && file !== null) {
        if(file === name) {
          if(callback !== undefined && callback !== null) {
            var returnConfig = function(fileData) {
              var data = fileData.toString();
              callback(data);
            };

            assetFound = true;
            loadConfig(Path.join(APP_DATA, name), returnConfig);
          }
        }
      } else if(file === null && !assetFound) {
        console.log('Creating ' + name);
        createConfig(Path.join(CONFIG_DIR, pattern), Path.join(APP_DATA, name), callback);
      }
    });

    fileIO.readDir(readStream, extType);
  };
}
