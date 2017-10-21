const Promise       = require('bluebird');
const ObjectFactory = require('./ObjectFactory');
const BaseFactory   = require('../../common/factory/BaseFactory');
const EnumUtil      = require('../../common/factory/EnumUtil');

function FactoryManager() { }

FactoryManager.prototype.initialize = Promise.coroutine(function* () {
  if(typeof FactoryManager.prototype.protoInit === 'undefined') {
    FactoryManager.prototype.protoInit = true;
    var baseFactory = Object.create(BaseFactory.prototype);
    var enumUtil    = Object.create(EnumUtil.prototype);

    var factory = Object.create(ObjectFactory.prototype);
    yield factory.initialize(baseFactory, enumUtil);

    return factory;
  } else {
    throw new Error('FactoryManager has already been initialized.')
  }
});

module.exports = FactoryManager;
