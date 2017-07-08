const Promise   = require('bluebird');
const Path      = require('path');

const SERVER_DIR  = Path.join(__dirname, '../../server');
const COMMON_DIR  = Path.join(__dirname, '../../common');
const FACTORY_DIR = '/factory/';
const FACTORY     = 'factory';
const SCHEMAS     = 'Schemas.js'
const FUNCTIONS   = 'functions';

var imports, log;

function ObjectFactory() { }

ObjectFactory.prototype.initialize = Promise.coroutine(function* (enumUtil) {
  if(typeof ObjectFactory.prototype.protoInit === 'undefined') {
    ObjectFactory.prototype.protoInit = true;

    imports = Object.create(Object.prototype);
    var serverImports   = yield enumUtil.getAllImports(SERVER_DIR, [FACTORY_DIR]);
    var commmonImports  = yield enumUtil.getAllImports(COMMON_DIR, [SCHEMAS]);

    Object.assign(imports, serverImports);
    Object.assign(imports, commmonImports);
    ObjectFactory.prototype.Enum = enumUtil.createEnums(imports);

    generateFunctionHeaders.call(this);

    var logManager  = this.createLogManager(false);
    log             = logManager.getLog(logManager.LogEnum.GENERAL);
  }
});

module.exports = ObjectFactory;

var generateFunctionHeaders = function() {
  for(let i in this.Enum) {
    this[`create${this.Enum[i]}`] = function (init) {
      if(log) {
        log.silly(`Creating ${this.Enum[i]}`);
      }

      var ObjectImport = require(imports[this.Enum[i]]);
      var object = Object.create(ObjectImport.prototype);

      if(!ObjectImport.prototype[FACTORY]) {
        Object.defineProperty(ObjectImport.prototype, FACTORY, {
          enumerable: false,
          writeable: false,
          value: this
        });
      }

      if(!ObjectImport.prototype[FUNCTIONS]) {
        Object.defineProperty(ObjectImport.prototype, FUNCTIONS, {
          enumerable: false,
          writeable: false,
          value: generateObjectFunctionEnum(object)
        });
      }

      if(typeof object.initialize !== 'undefined') {
        var result = object.initialize(init);
        if(result instanceof Promise) {
          object = result;
        }
      }

      return object;
    }.bind(this);
  }
};

var generateObjectFunctionEnum = function(object) {
  var funcs = {};
  for (var property in object) {
    if (typeof object[property] === 'function') {
      funcs[property.toUpperCase()] = property;
    }
  }
  return funcs;
}
