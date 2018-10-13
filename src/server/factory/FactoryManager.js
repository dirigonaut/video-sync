const Promise       = require('bluebird');
const ObjectFactory = require('./ObjectFactory');
const BaseFactory   = require('../../common/factory/BaseFactory');
const PathUtil      = require('../utils/PathUtil');

function FactoryManager() { }

FactoryManager.prototype.initialize = Promise.coroutine(function* () {
  if(typeof FactoryManager.prototype.protoInit === 'undefined') {
    FactoryManager.prototype.protoInit = true;
    var baseFactory = Object.create(BaseFactory.prototype);
    var pathUtil    = Object.create(PathUtil.prototype);

    var factory = Object.create(ObjectFactory.prototype);
    yield factory.initialize(baseFactory, pathUtil);

    return factory;
  } else {
    throw new Error('FactoryManager has already been initialized.')
  }
});

module.exports = FactoryManager;
