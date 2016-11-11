function FileSystemUtils() {

}

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

  var parsed_dir = splitPath.splice(0, splitPath.length - 2);
  return parsed_dir.merge();
};

FileSystemUtils.prototype.splitExtensionFromPath = function(path) {
  var splitPath = this.splitPath(path);

  var parsed_file = splitPath[splitPath.length - 1].split(".");
  return parsed_file[1];
};

FileSystemUtils.prototype.isPath = function(path) {
  var isPath = false;

  if(path.charAt(0) === "/") {
    isPath = true;
  } else if(path.charAt(1) === ":") {
    isPath = true;
  }

  return isPath;
};

module.exports = FileSystemUtils;
