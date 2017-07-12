const Promise       = require('bluebird');
const Imports       = require('./Imports');
const ObjectFactory = require('./ClientObjectFactory');

function ClientFactoryManager() { }

ClientFactoryManager.prototype.initialize = Promise.coroutine(function* () {
  var imports = Object.create(Imports);

  var factory = Object.create(ObjectFactory.prototype);
  yield factory.initialize(imports);

  return factory;
});

module.exports = ClientFactoryManager;
