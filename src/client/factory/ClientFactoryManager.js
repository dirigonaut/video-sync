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
  var factory   = Object.create(ObjectFactory.prototype);

  ObjectFactory.prototype.Enum = Object.keys(imports);
  base.generateFactory.call(factory, ObjectFactory, imports);

  return factory;
}
