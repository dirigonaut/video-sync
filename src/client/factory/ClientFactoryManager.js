const Imports = require('./Imports');

function ClientFactoryManager() { }

ClientFactoryManager.prototype.initialize = function() {
  if(typeof ClientFactoryManager.prototype.protoInit === 'undefined') {
    ClientFactoryManager.prototype.protoInit = true;
    var factory   = Object.create(Object.prototype);
    var imports   = Object.create(Imports.prototype);

    var base      = Object.create(imports.BaseFactory.prototype);
    var enumUtil  = Object.create(imports.EnumUtil.prototype);

    factory.prototype.Enum = enumUtil.createEnums(imports);
    base.generateFactory.call(factory, imports);

    return factory;
  } else {
    throw new Error('ClientFactoryManager has already been initialized.')
  }
};

module.exports = ClientFactoryManager;
