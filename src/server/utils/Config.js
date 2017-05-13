var FileIO    = require("./FileIO");
var FileUtils = require('./FileSystemUtils');

const APP_DATA = (process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : process.env.HOME + '/.config')) + '/video-sync/';
const CONFIG_NAME = "config.json"
const DEFAULT_CONFIG = ;

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
            loadConfig(`${APP_DATA}${CONFIG_NAME}`, setConfig);
          }
        } else if(file === null && config === null) {
          createConfig(DEFAULT_CONFIG, `${APP_DATA}${CONFIG_NAME}`, callback);
        }
      });

      fileIO.readDir(readStream, "json");
    }
  }

  fileIO.ensureDirExists(APP_DATA, 484, checkAssets);
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
