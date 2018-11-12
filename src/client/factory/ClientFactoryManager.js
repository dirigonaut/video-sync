const Imports = require("./Imports");

var factory;

function ClientFactoryManager() { }

ClientFactoryManager.prototype.getFactory = function() {
  if(factory === undefined) {
    factory = createFactory();
  }

  return factory;
};

module.exports = ClientFactoryManager;

function createFactory() {
  if(typeof ClientFactoryManager.prototype.protoInit === "undefined") {
    ClientFactoryManager.prototype.protoInit = true;
    var imports   = Object.create(Object.prototype);
    Object.assign(imports, Imports);

    function ObjectFactory() { }

    var base      = Object.create(imports.BaseFactory.prototype);
    var factory   = Object.create(ObjectFactory.prototype);

    ObjectFactory.prototype.Enum = Object.keys(imports);
    base.generateFactory.call(factory, ObjectFactory, imports);

    return factory;
  } else {
    throw new Error("ClientFactoryManager has already been initialized.");
  }
};
