
var config;

function Config() {

}

Config.prototype.initialize = function(path) {
  config = loadConfig(path);
};

Config.prototype.getConfig = function() {
  return config;
};

module.exports = Config;

function setupLocalDataDir(path) {

};

function loadConfig(path) {
  return null;
};
