const ObjectFactory = require('./ClientObjectFactory');
const Imports       = require('./Imports');

function ClientFactoryManager() { }

ClientFactoryManager.prototype.initialize = function() {
  if(typeof ClientFactoryManager.prototype.protoInit === 'undefined') {
    ClientFactoryManager.prototype.protoInit = true;
    var factory   = Object.create(ObjectFactory.prototype);
    var imports   = Object.create(Imports.prototype);

    var base      = Object.create(imports.BaseFactory.prototype);
    var enumUtil  = Object.create(imports.EnumUtil.prototype);

    factory.initialize(base, enumUtil, imports);

    return factory;
  } else {
    throw new Error('ClientFactoryManager has already been initialized.')
  }
};

module.exports = ClientFactoryManager;
