const Promise         = require('bluebird');
const FactoryManager  = require('./src/server/factory/FactoryManager');

var masterProcess, factoryManager;

var start = Promise.coroutine(function* () {
  factoryManager = Object.create(FactoryManager.prototype);

  var factory = yield factoryManager.initialize();

  masterProcess = yield factory.createMasterProcess();
  yield masterProcess.start();
})();
