const Promise = require('bluebird');
const should  = require('should');

const ObjectFactory = require('../../../../src/server/factory/ObjectFactory');

describe('ObjectFactory', function() {
  describe('#initialize()', function() {
    it('should initialize the ObjectFactory', Promise.coroutine(function* () {
      var factory = Object.create(ObjectFactory.prototype);
      yield factory.initialize();
    }));
  });
});
