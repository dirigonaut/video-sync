const Promise     = require('bluebird');
const Path        = require('path');
const EnumUtil    = require('../../src/server/utils/EnumUtil');
const MockObject  = require('./MockObject');

const ROOT_DIR  = Path.join(__dirname, "../../src/server");
const FACTORY_DIR = '/factory/';

var imports;
var enumUtil

function MockFactory() { }

MockFactory.prototype.initialize = Promise.coroutine(function* () {
  enumUtil = Object.create(EnumUtil.prototype);

  imports = yield enumUtil.getAllImports(ROOT_DIR, [FACTORY_DIR]);
  MockFactory.prototype.ImportEnum = enumUtil.createEnums(imports);
});

MockFactory.prototype.createMockMixin = function(dependencies) {
  var mixin = { };

  if(dependencies) {
    for(let i = 0; i < dependencies.length; ++i) {
      var Import = require(imports[this.ImportEnum[dependencies[i].toUpperCase()]]);
      mixin[enumUtil.firstCharToLowerCase(dependencies[i])] = this.createMockObject(Import.prototype);
    }
  }

  return mixin;
};

MockFactory.prototype.createMockObject = function(objectPrototype) {
  var mockObject = Object.create(MockObject.prototype);

  if(objectPrototype) {
    var mock = { };
    var enumUtil = Object.create(EnumUtil.prototype);

    for(let property in objectPrototype) {
      if (objectPrototype.hasOwnProperty(property)) {
        mock[property] = function() {
          var args = Array.from(arguments);
          args.unshift(property);
          return this.callMock.apply(this, args);
        };
      }
    }

    mock.Enum = enumUtil.createEnums(mock);
    Object.assign(mockObject, mock);
  }

  return mockObject;
};

module.exports = MockFactory;
