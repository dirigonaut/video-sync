const Promise   = require('bluebird');
const Path      = require('path');

const ROOT_DIR    = Path.join(__dirname, '../../server');
const FACTORY_DIR = '/factory/';
const FACTORY     = 'factory';

var imports, log;

function ObjectFactory() { }

ObjectFactory.prototype.initialize = Promise.coroutine(function* (enumUtil, dependencyFactory) {
  if(typeof ObjectFactory.prototype.protoInit === 'undefined') {
    imports = Object.create(Object.prototype);
    var rawImports = yield enumUtil.getAllImports(ROOT_DIR, [FACTORY_DIR]);

    Object.assign(imports, rawImports);
    ObjectFactory.prototype.Enum = enumUtil.createEnums(imports);

    generateFunctionHeaders.call(this, logger);

    var logManager  = this.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.GENERAL);

    ObjectFactory.prototype.protoInit = true;
  }
});

module.exports = ObjectFactory;

var generateFunctionHeaders = function(logger) {
  for(let i in this.Enum) {
    this[`create${this.Enum[i]}`] = function () {
      logger(this.Enum[i]);

      var ObjectImport = require(imports[this.Enum[i]]);
      var object = Object.create(ObjectImport.prototype);

      object[FACTORY] = this;

      if(typeof object.initialize !== 'undefined') {
        object.initialize();
      }

      return object;
    }.bind(this);
  }
};

var logger = function(name) {
  if(log && typeof log.debug !== 'undefined') {
    log.silly(`Creating ${name}`);
  }
};
