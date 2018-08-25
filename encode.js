const Promise         = require('bluebird');
const Path            = require('path');
const FactoryManager  = require('./src/server/factory/FactoryManager');

var encoder, factoryManager;

var args = process.argv.slice(2);

if(args.length < 2 and args.length > 3){
  throw new Error("Encoding requires a path to the config to use and quality parameter with an optional dir argument instead of: ", args);
}

if(!Path.isAbsolute(args[0])){
  throw new Error("The first argument is expected to be an absolute path to the config it should run with.", args);
}

if(!Array.isArray(args[1])){
  throw new Error("The second argument is expected to be a list of strings instead of: ", args[0].constructor);
}

if(args[1] && !Path.isAbsolute(args[2])){
  throw new Error("The third optional argument is expected to be a absolute path to a dir instead of: ", args[1]);
}

var start = Promise.coroutine(function* (configPath, qualities, inDir) {
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
  logManager.addFileLogging();

  encoder = factory.createEncoder();
  yield encoder.start.apply(this, getCodecArgs(config, qualities, inDir));
})(args);

var getCodecArgs = function(config, qualities, inDir) {
  return [qualities, inDir ? inDir : config.getConfig().encodeDir, config.getConfig().mediaDir];
};
