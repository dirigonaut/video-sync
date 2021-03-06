const Promise         = require('bluebird');
const LockFile        = require('lockfile');
const Cluster         = require('cluster');
const Path            = require('path');
const FactoryManager  = require('./src/server/factory/FactoryManager');

var masterProcess, factoryManager;

var args = process.argv.slice(2);

var configPath;
if(args.length !== 1 || !Path.isAbsolute(args[0]) ) {
  if(process.env.VIDEO_SYNC_CONFIG) {
      if(Path.isAbsolute(process.env.VIDEO_SYNC_CONFIG)) {
        configPath = process.env.VIDEO_SYNC_CONFIG;
      } else {
        throw new Error(
          `VIDEO_SYNC_CONFIG env var is expected to be an absolute path not: ${process.env.VIDEO_SYNC_CONFIG}`);
      }
  } else {
    throw new Error(
      `Video Sync takes one parameter that is a path to the config it should run with not: ${args}`);
  }
} else {
  configPath = args[0];
}

console.log(`Using config: ${configPath}`);

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

  var server = Promise.coroutine(function* () {
    masterProcess = factory.createMasterProcess();
    yield masterProcess.start();
  });

  //If locking is enabled then grab file lock
  if(typeof config.getConfig().serverInfo.lockDir !== "undefined") {
    if(Cluster.isMaster) {
      process.on('exit', (code) => {
        LockFile.unlock(Path.join(config.getConfig().serverInfo.lockDir, "video-sync-server.lock"), console.log);
      });

      LockFile.lock(Path.join(config.getConfig().serverInfo.lockDir, "video-sync-server.lock"), {},
        Promise.coroutine(function* (err) { err ? console.log(err) : yield server(); }));
    } else {
      yield server();
    }
  } else {
    yield server();
  }

})(configPath);
