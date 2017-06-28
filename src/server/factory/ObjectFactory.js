const Promise   = require('bluebird');
const Path      = require('path');
const Factory   = require('./FactoryWrapper'),

const ROOT_DIR    = Path.join(__dirname, "../../server");
const FACTORY_DIR = '/factory/';
const FACTORY     = "factory";

var imports;

function ObjectFactory() { }

ObjectFactory.prototype.initialize = Promise.coroutine(function* (enumUtil, dependencyFactory) {
  imports = Object.create(Object.prototype);
  var rawImports = yield enumUtil.getAllImports(ROOT_DIR, [FACTORY_DIR]);

  Object.assign(imports, rawImports);

  ObjectFactory.prototype.Enum = enumUtil.createEnums(imports);

  generateFunctionHeaders.call(this);
});

module.exports = ObjectFactory;

var generateFunctionHeaders = function() {
  for(let i in this.Enum) {
    this.[`create${this.Enum[i]}`] = function(init) {
      var ObjectImport = require(imports[this.Enum[i]]);
      var object = Object.create(ObjectImport.prototype);

      object[FACTORY] = Object.create(Factory.prototype).getFactory();

      if(init) {
        object.initialize();
      }
      
      return object;
    });
  }
};
