const Imports = require('./Imports');

function ClientFactoryManager() { }

ClientFactoryManager.prototype.initialize = function() {
  if(typeof ClientFactoryManager.prototype.protoInit === 'undefined') {
    ClientFactoryManager.prototype.protoInit = true;
    var imports   = Object.create(Object.prototype);
    Object.assign(imports, Imports);
    
    return createFactory(imports);
  } else {
    throw new Error('ClientFactoryManager has already been initialized.');
  }
};

module.exports = ClientFactoryManager;

function createFactory(imports) {
  function ObjectFactory() { }

  var base      = Object.create(imports.BaseFactory.prototype);
  var enumUtil  = Object.create(imports.EnumUtil.prototype);

  ObjectFactory.prototype.Enum = enumUtil.createEnums(imports);
  base.generateFactory.call(ObjectFactory, imports);

  return ObjectFactory;
}
