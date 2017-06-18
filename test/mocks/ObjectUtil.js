const Promise     = require('bluebird');
const Path        = require('path');
const Fs          = Promise.promisifyAll(require('fs'));

const GENERATOR_REGEX = 'coroutine';

const FUNCTION_TYPE = 'function';
const GENERATOR_TYPE = 'generator';

function ObjectUtil() { }

ObjectUtil.prototype.getFunctionTypes = Promise.coroutine(function* (objectName, objectPath) {
  var functions = yield getFunctionHandles(objectName, objectPath);
  var Import = require(objectPath);
  var mappedFuncs = {};

  if(Import) {
    for(let property in Import.prototype) {
      for(let i = 0; i < functions.length; ++i) {
        if(functions[i].search(property) !== -1) {
          mappedFuncs[property] = functions[i];
          break;
        }
      }
    }
  }

  var meta;
  if(mappedFuncs) {
    meta = tagFunctionTypes(mappedFuncs);
  }

  return meta;
});

module.exports = ObjectUtil;

var getFunctionHandles = Promise.coroutine(function* (objectName, objectPath) {
  var file = yield Fs.readFileAsync(objectPath, "utf8");

  var regex = new RegExp(`${objectName}\.prototype\.`, 'g');
  var index = file.search(regex);
  var string = file.substring(index);
  var functions = [];

  while(index !== -1) {
    functions.push(string.substring(0, index));
    var length = String(regex).split("/")[1].length;
    string = string.substring(length);
    index = string.search(regex);

    string = string.substring(index)
  }

  return functions;
});

var tagFunctionTypes = function(funcMap) {
  var metaMap = {};
  var regex = new RegExp(GENERATOR_REGEX, 'g');

  for(let property in funcMap) {
    if(funcMap[property].search(regex) !== -1) {
      metaMap[property] = GENERATOR_TYPE;
    } else {
      metaMap[property] = FUNCTION_TYPE;
    }
  }

  return metaMap;
};
