const Promise   = require("bluebird");
const Yaml      = require("js-yaml");
const Path      = require("path");
const Fs        = Promise.promisifyAll(require("fs"));

var config;

function Config() { }

Config.prototype.initialize = function() {
  if(typeof Config.prototype.protoInit === "undefined") {
    Config.prototype.protoInit = true;
  }
};

Config.prototype.isInit = function() {
  return config ? true : false;
};

Config.prototype.getConfig = function() {
  return config;
};

Config.prototype.load = Promise.coroutine(function* (path) {
  var binaryConfig = yield Fs.readFileAsync(path);

  try {
    if(binaryConfig) {
      config = Yaml.safeLoad(binaryConfig);
    }
  } catch(e) {
    throw new Error(`Json syntax error in config file: ${path}, error: ${e}`);
  }

  return config;
});

module.exports = Config;
