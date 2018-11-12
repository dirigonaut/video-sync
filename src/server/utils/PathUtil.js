const Promise   = require("bluebird");
const Events    = require("events");
const Find      = require("find");
const Path      = require("path");
const Crypto    = require("crypto");

const FileUtils = require("./FileSystemUtils");

function PathUtil() { }

PathUtil.prototype.getAllPaths = function(path, excludes, regex, uniqueKeys) {
  if(path && Path.isAbsolute(path)) {
    var fileUtils = Object.create(FileUtils.prototype);
    var asyncEmitter = new Events();
    var files = {};

    Find.eachfile(regex, path, function(filePath) {
      if(filePath) {
        var key = uniqueKeys ? getHash(files) : fileUtils.splitNameFromPath(filePath);

        var foundExclude = false;
        if(excludes) {
          for(let i in excludes) {
            if(filePath.includes(excludes[i])) {
              foundExclude = filePath;
            }
          }
        }

        if(!foundExclude) {
          files[key] = filePath;
        }
      }
    })
    .end(function() {
      asyncEmitter.emit("finished", files);
    })
    .error(function(err) {
      asyncEmitter.emit("error", err);
    });

    return new Promise(function(resolve, reject) {
      asyncEmitter.once("finished", resolve);
      asyncEmitter.once("error", reject);
    });
  } else {
    throw new Error(`${path} is not a valid path.`);
  }
};

PathUtil.prototype.createEnums = function(object) {
  var keys = Object.keys(object);
  var Enums = { };

  for(let i = 0; i < keys.length; ++i) {
    Enums[keys[i].toUpperCase()] = keys[i];
  }

  return Enums;
};

module.exports = PathUtil;

var getHash = function(object) {
  while(true) {
    hash = Crypto.randomBytes(32).toString("hex");
    if(!object[hash]) {
      return hash;
    }
    continue;
  }
};
