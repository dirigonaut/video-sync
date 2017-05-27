var Cluster   = require('cluster');
var Path      = require('path');

var FileIO    = require("./FileIO");
var FileUtils = require('./FileSystemUtils');

const LOG_DIR  = "logs";
const CONFIG_NAME = "config.json"
const REDIS_CONFIG = "redis.conf"
const ROOT_DIR = Path.join(__dirname, "../../../");
const APP_DATA = Path.join(process.env.APPDATA || Path.join(process.env.HOME,
  (process.platform == 'darwin' ?  Path.join('Library', 'Preferences') : '.config')), 'video-sync');

var config = null;

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
  return Path.join(APP_DATA, LOG_DIR);
};

module.exports = Config;

function setupAppDataDir(callback) {
  var fileIO = new FileIO();

  var checkAllAssets = function(exists) {
    if(exists) {
      ensureAssetExists(REDIS_CONFIG, "conf")();
      ensureAssetExists(CONFIG_NAME, "json", function(configuration) {
        config = JSON.parse(configuration);
        callback();
      })();
    }
  };

  fileIO.ensureDirExists(APP_DATA, 484, checkAllAssets);
  fileIO.ensureDirExists(Path.join(APP_DATA, LOG_DIR), 484, null);
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

function ensureAssetExists(name, extType, callback) {
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
        createConfig(Path.join(ROOT_DIR, name), Path.join(APP_DATA, name), callback);
      }
    });

    fileIO.readDir(readStream, extType);
  };
}
