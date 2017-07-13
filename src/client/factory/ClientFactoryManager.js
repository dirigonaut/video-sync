const Imports       = require('./Imports');
const ObjectFactory = require('./ClientObjectFactory');

function ClientFactoryManager() { }

ClientFactoryManager.prototype.initialize = function() {
  var imports = Object.create(Imports);

  var factory = Object.create(ObjectFactory.prototype);
  factory.initialize(imports);

  return factory;
};

module.exports = ClientFactoryManager;
