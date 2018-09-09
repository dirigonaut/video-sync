const Promise         = require('bluebird');
const Path            = require('path');
const FactoryManager  = require('./src/server/factory/FactoryManager');

var masterProcess, factoryManager;

var args = process.argv.slice(2);

if(args.length !== 1 || !Path.isAbsolute(args[0]) ) {
  throw new Error("Video Sync takes one parameter that \
    is a path to the config it should run with.", args);
}

var start = Promise.coroutine(function* (configPath) {
  factoryManager = Object.create(FactoryManager.prototype);
  var factory = yield factoryManager.initialize();

  var config = factory.createConfig(true);
  yield config.load(configPath);

  var checkConfig = factory.createCheckConfig();
  yield checkConfig.validateConfig().catch(function(error) {
    console.error(error);
    process.exit(1);
  });

  var logManager = factory.createLogManager();
  logManager.addFileLogging(config.getConfig().dirs.serverLogDir);

  masterProcess = factory.createMasterProcess();
  yield masterProcess.start();
})(args);
