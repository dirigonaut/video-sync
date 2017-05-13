var appData = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + 'Library/Preferences' : process.env.HOME + '/.config')
appData += '/video-sync/';

var config;

function Config() {

}

Config.prototype.initialize = function(path) {
  config = loadConfig(appData);
};

Config.prototype.getConfig = function() {
  return config;
};

Config.prototype.getAppDataDir = function() {
  return appData;
};

module.exports = Config;

function setupAppDataDir(path) {

};

function loadConfig(path) {
  return null;
};
