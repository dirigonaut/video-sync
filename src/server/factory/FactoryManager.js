const Promise             = require('bluebird');
const ObjectFactory       = require('./ObjectFactory');
const DependencyFactory   = require('./DependencyFactory');
const FactoryWrapper      = require('./FactoryWrapper');
const EnumUtil            = require('../utils/EnumUtil');

function FactoryManager() { }

FactoryManager.prototype.initialize = Promise.coroutine(function* () {
  var enumUtil = Object.create(EnumUtil.prototype);

  var dependency = Object.create(DependencyFactory.prototype);
  dependency.initialize(enumUtil);

  var factory = Object.create(ObjectFactory.prototype);
  yield factory.initialize(enumUtil, dependency);

  var wrapper = Object.create(FactoryWrapper.prototype);
  wrapper.setFactory(factory);

  return wrapper.getFactory();
});

module.exports = FactoryManager;
