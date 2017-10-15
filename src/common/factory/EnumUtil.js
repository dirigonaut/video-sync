const Promise   = require('bluebird');
const Events    = require('events');
const Find      = require('find');
const Path      = require('path');

const FileUtils = require('../utils/FileSystemUtils');

function EnumUtil() { }

EnumUtil.prototype.getAllImports = function(path, excludes) {
  if(path && Path.isAbsolute(path)) {
    var fileUtils = new FileUtils();

    var imports = {};

    var asyncEmitter = new Events();
    var finished = "finished";
    var error = "error";

    Find.eachfile(/\.js$/, path, function(filePath) {
      if(filePath) {
        var key = fileUtils.splitNameFromPath(filePath);

        var foundExclude = false;
        if(excludes) {
          for(let i in excludes) {
            if(filePath.includes(excludes[i])) {
              foundExclude = filePath;
            }
          }
        }

        if(!foundExclude) {
          imports[key] = filePath;
        }
      }
    })
    .end(function() {
      asyncEmitter.emit(finished, imports);
    })
    .error(function(err) {
      asyncEmitter.emit(error, err);
    });

    return new Promise(function(resolve, reject) {
      asyncEmitter.once(finished, resolve);
      asyncEmitter.once(error, reject);
    });
  } else {
    throw new Error(`${path} is not a valid path.`);
  }
};

EnumUtil.prototype.createEnums = function(object) {
  var keys = Object.keys(object);
  var Enums = { };

  for(let i = 0; i < keys.length; ++i) {
    Enums[keys[i].toUpperCase()] = keys[i];
  }

  return Enums;
};

EnumUtil.prototype.filterOut = function(object, filterOut) {
  for(let property in object) {
    if(filterOut.hasOwnProperty(property.toUpperCase())) {
      delete object[property];
    }
  }

  return object;
};

module.exports = EnumUtil;
