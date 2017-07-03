const Promise             = require('bluebird');
const ObjectFactory       = require('./ObjectFactory');
const EnumUtil            = require('../utils/EnumUtil');

function FactoryManager() { }

FactoryManager.prototype.initialize = Promise.coroutine(function* () {
  var enumUtil = Object.create(EnumUtil.prototype);

  var factory = Object.create(ObjectFactory.prototype);
  yield factory.initialize(enumUtil);

  return factory;
});

module.exports = FactoryManager;
