const Promise         = require('bluebird');
const FactoryManager  = require('./src/server/factory/FactoryManager');

var masterProcess, factoryManager;

var start = Promise.coroutine(function* () {
  factoryManager = Object.create(FactoryManager.prototype);
  var factory = yield factoryManager.initialize();

  var config = factory.createConfig(true);
  if(config instanceof Promise) {
    config = yield config;
  }

  var checkConfig = factory.createCheckConfig();
  yield checkConfig.validateConfig().catch(function(error) {
    console.error(error);
    process.exit(1);
  });

  var logManager = factory.createLogManager();
  logManager.addFileLogging();

  masterProcess = factory.createMasterProcess();
  yield masterProcess.start();
})();
