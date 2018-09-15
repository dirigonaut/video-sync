const Promise         = require('bluebird');
const Path            = require('path');
const Util            = require('util');
const FactoryManager  = require('./src/server/factory/FactoryManager');

var encoder, factoryManager;

const PARAMS = { CONFIG : "-c", ENCODE_DIR : "-d", TEMPLATES : "-t", DRY_RUN : "-dry" };
args = { };
process.argv.forEach(function (val, index, array) {
  switch(val) {
    case PARAMS.CONFIG:
      if(!Path.isAbsolute(array[index + 1])){
        throw new Error("The argument -c (config) is expected to be an absolute path to the config it should run with.", args);
      } else {
        args[PARAMS.CONFIG] = array[index + 1];
      }
      break;
    case PARAMS.ENCODE_DIR:
      if(!Path.isAbsolute(array[index + 1])){
        throw new Error("The -d argument is expected to be an absolute path to the directory to recursively crawl and encode.", args);
      } else {
        args[PARAMS.ENCODE_DIR] = array[index + 1];
      }
      break;
    case PARAMS.TEMPLATES:
      var templates = [];

      for(var i = index + 1; i < array.length; ++i) {
        if(array[i].match(PARAMS.CONFIG) || array[i].match(PARAMS.ENCODE_DIR)) {
          break;
        } else {
          templates.push(array[i]);
        }
      }

      args[PARAMS.TEMPLATES] = templates;
      break;
    case PARAMS.DRY_RUN:
      args[PARAMS.DRY_RUN] = true;
      break;
  }
});

console.log(`Running with commands: ${Util.inspect(args)}`);
var start = Promise.coroutine(function* (configPath, inDir, templateIds) {
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
  logManager.addFileLogging(config.getConfig().dirs.encodeLogDir);

  encoder = factory.createEncoder();
  codecArgs = [templateIds, inDir ? inDir : config.getConfig().dirs.encodeDir, config.getConfig().dirs.mediaDir];
  yield encoder.start.apply(encoder, codecArgs);
}).call(this, args[PARAMS.CONFIG], args[PARAMS.ENCODE_DIR], args[PARAMS.TEMPLATES]);
