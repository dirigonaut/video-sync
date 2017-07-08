const Os    = require('os');
const Path  = require('path');

function FileSystemUtils() { }

FileSystemUtils.prototype.splitPath = function(path) {
  var parsed_path = path.split("/");

  if(parsed_path.length <= 1) {
    parsed_path = path.split("\\");
  }

  return parsed_path;
};

FileSystemUtils.prototype.splitNameFromPath = function(path) {
  var splitPath = this.splitPath(path);

  var parsed_file = splitPath[splitPath.length - 1].split(".");
  return parsed_file[0];
};

FileSystemUtils.prototype.splitDirFromPath = function(path) {
  var splitPath = this.splitPath(path);
  return path.substring(0, path.length - splitPath[splitPath.length - 1].length);
};

FileSystemUtils.prototype.splitExtensionFromPath = function(path) {
  var splitPath = this.splitPath(path);

  var parsed_file = splitPath[splitPath.length - 1].split(".");
  return parsed_file[1];
};

FileSystemUtils.prototype.isPath = function(path) {
  return path !== Path.basename(path);
};

FileSystemUtils.prototype.ensureEOL = function(string) {
  var lastChar = string.slice(-1);
  if(lastChar !== '/' && lastChar !== '\\') {
    string = process.platform === 'win32' ? string + '\\' : string + '/';
  }
  return string;
}

FileSystemUtils.prototype.getEOL = function() {
  return Os.EOL;
};

module.exports = FileSystemUtils;
