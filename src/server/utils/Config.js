var Path      = require('path');

var FileIO    = require("./FileIO");
var FileUtils = require('./FileSystemUtils');

const LOG_DIR  = "logs";
const CONFIG_NAME = "config.json"
const ROOT_DIR = Path.join(__dirname, "../");
const APP_DATA = Path.join(process.env.APPDATA || Path.join(process.env.HOME,
  (process.platform == 'darwin' ?  Path.join('Library', 'Preferences') : '.config')), 'video-sync');

var config = null;

function Config() {
};

Config.prototype.initialize = function(callback) {
  setupAppDataDir(callback);
};

Config.prototype.getConfig = function() {
  return config;
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
  var fileUtils = new FileUtils();

  var checkAssets = function(exists) {
    if(exists) {
      var readStream = fileIO.createStreamConfig(APP_DATA, function(file) {
        if(file !== undefined && file !== null) {
          if(file === CONFIG_NAME) {
            var setConfig = function(fileData) {
              config = JSON.parse(fileData);
              callback();
            };

            config = {};
            loadConfig(Path.join(APP_DATA, CONFIG_NAME), setConfig);
          }
        } else if(file === null && config === null) {
          createConfig(Path.join(ROOT_DIR, CONFIG_NAME), Path.join(APP_DATA, CONFIG_NAME), callback);
        }
      });

      fileIO.readDir(readStream, "json");
    }
  }

  fileIO.ensureDirExists(APP_DATA, 484, checkAssets);
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
      callback();
    };

    fileIO.write(writeStream, fileData);
  }

  loadConfig(pathFrom, saveToAppDir);
};
