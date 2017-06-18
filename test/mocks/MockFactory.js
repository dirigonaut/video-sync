const Promise     = require('bluebird');
const Path        = require('path');
const EnumUtil    = require('../../src/server/utils/EnumUtil');
const MockObject  = require('./MockObject');
const ObjectUtil = require('./ObjectUtil');

const ROOT_DIR  = Path.join(__dirname, "../../src/server");
const FACTORY_DIR = '/factory/';

var imports;
var enumUtil
var objectUtil;

function MockFactory() { }

MockFactory.prototype.initialize = Promise.coroutine(function* (excludes) {
  enumUtil = Object.create(EnumUtil.prototype);
  objectUtil = Object.create(ObjectUtil.prototype);

  imports = yield enumUtil.getAllImports(ROOT_DIR);
  MockFactory.prototype.ImportEnum = enumUtil.createEnums(imports);
});

MockFactory.prototype.createMockMixin = function(dependencies) {
  var mixin = { };

  if(dependencies) {
    for(let i = 0; i < dependencies.length; ++i) {
      var Import = this.getImport(dependencies[i]);
      mixin[enumUtil.firstCharToLowerCase(dependencies[i])] = this.createMockObject(dependencies[i], Import.prototype);
    }
  }

  return mixin;
};

MockFactory.prototype.createMockObject = function(key, objectPrototype) {
  var mockObject = Object.create(MockObject.prototype);

  if(objectPrototype) {
    var mock = { };
    var enumUtil = Object.create(EnumUtil.prototype);
    var functions = objectUtil.getFunctionTypes(key, imports[this.ImportEnum[key.toUpperCase()]]);

    for(let property in objectPrototype) {
      if(objectPrototype.hasOwnProperty(property)) {
        if(functions[property] === "generator") {
          mock[property] = Promise.coroutine(function* () {
            var args = Array.from(arguments);
            args.unshift(property);
            return this.callMockAsync.apply(this, args);
          });
        } else {
          mock[property] = function() {
            var args = Array.from(arguments);
            args.unshift(property);
            return this.callMock.apply(this, args);
          };
        }
      }
    }

    mock.Enum = enumUtil.createEnums(mock);
    Object.assign(mockObject, mock);
  }

  return mockObject;
};

MockFactory.prototype.getImport = function(dependency) {
  if (!dependency){
    console.error(`Import: ${dependency} does not exist, check for typos.`);
  }

  return require(imports[this.ImportEnum[(dependency).toUpperCase()]]);
};

module.exports = MockFactory;
