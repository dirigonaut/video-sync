function FileSystemUtils() { }

FileSystemUtils.prototype.splitPath = function(path) {
  var parsedPath = path.split("/");

  if(parsedPath.length <= 1) {
    parsedPath = path.split("\\");
  }

  return parsedPath;
};

FileSystemUtils.prototype.splitNameFromPath = function(path) {
  var splitPath = this.splitPath(path);

  var parsedPath = splitPath[splitPath.length - 1];
  parsedPath = parsedPath.split(".");
  parsedPath.pop();
  return parsedPath.join(".");
};

FileSystemUtils.prototype.splitDirFromPath = function(path) {
  var splitPath = this.splitPath(path);
  return path.substring(0, path.length - splitPath[splitPath.length - 1].length);
};

FileSystemUtils.prototype.splitExtensionFromPath = function(path) {
  var splitPath = this.splitPath(path);
  return splitPath[splitPath.length - 1].split(".").pop();
};

FileSystemUtils.prototype.ensureEOL = function(string) {
  var lastChar = string.slice(-1);
  if(lastChar !== "/" && lastChar !== "\\") {
    string = process.platform === "win32" ? string + "\\" : string + "/";
  }
  return string;
}

module.exports = FileSystemUtils;
