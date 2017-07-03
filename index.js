const Promise         = require('bluebird');
const FactoryManager  = require('./src/server/factory/FactoryManager');

var masterProcess, factoryManager;

var start = Promise.coroutine(function* () {
  factoryManager = Object.create(FactoryManager.prototype);

  var factory = yield factoryManager.initialize();

  var logManager = factory.createLogManager();
  logManager.addFileLogging();

  var config = factory.createConfig();
  yield config.initializeAsync();

  masterProcess = factory.createMasterProcess();
  yield masterProcess.start();
})();
