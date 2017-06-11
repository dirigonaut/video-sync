const Promise         = require('bluebird');
const ObjectFactory   = require('./ObjectFactory');
const FactoryWrapper  = require('./FactoryWrapper');

function FactoryManager() { }

FactoryManager.prototype.initialize = Promise.coroutine(function* () {
  var factory = Object.create(ObjectFactory.prototype);
  yield factory.initialize();

  var wrapper = Object.create(FactoryWrapper.prototype);
  wrapper.setFactory(factory);

  return wrapper.getFactory();
});

module.exports = FactoryManager;
