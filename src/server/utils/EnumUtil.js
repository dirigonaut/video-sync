const Promise   = require('bluebird');
const Events    = require('events');
const Find      = require('find');

const FileUtils = require('../utils/FileSystemUtils');

function EnumUtil() { }

EnumUtil.prototype.getAllImports = function(path, excludes) {
  var fileUtils = new FileUtils();

  var imports = {};

  var asyncEmitter = new Events();
  var finished = "finished";
  var error = "error";

  Find.eachfile(/\.js$/, path, function(filePath) {
    if(filePath) {
      var key = fileUtils.splitNameFromPath(filePath);

      if(excludes) {
        for(let i in excludes) {
          if(!filePath.includes(excludes[i])) {
            imports[key] = filePath;
          }
        }
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
};

EnumUtil.prototype.createEnums = function(object) {
  var keys = Object.keys(object);
  var enums = { };

  for(let i = 0; i < keys.length; ++i) {
    enums[keys[i].toUpperCase()] = keys[i];
  }

  return enums;
};

EnumUtil.prototype.firstCharToLowerCase = function(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
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
