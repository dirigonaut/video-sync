const Promise         = require('bluebird');
const LockFile        = require('lockfile');
const Path            = require('path');
const Util            = require('util');
const Assert          = require('assert');
const FactoryManager  = require('./src/server/factory/FactoryManager');

var encoder, factoryManager;

const PARAMS = { CONFIG : "-c", ENCODE_DIR : "-d", TEMPLATES : "-t", DRY_RUN : "-dry", PLAN: "-p" };
args = { };
process.argv.forEach(function (val, index, array) {
  switch(val) {
    case PARAMS.CONFIG:
      if(Path.isAbsolute(array[index + 1])){
        args[PARAMS.CONFIG] = array[index + 1];
      } else if(Path.isAbsolute(process.env.VIDEO_SYNC_CONFIG)) {
        args[PARAMS.CONFIG] = process.env.VIDEO_SYNC_CONFIG;
      } else {
        throw new Error("The argument -c (config) is expected to be an absolute path to the config it should run with.", args);
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
    case PARAMS.PLAN:
      if(Path.isAbsolute(array[index + 1])){
        args[PARAMS.PLAN] = array[index + 1];
      } else {
        throw new Error("The argument -p (plan) is expected to be an absolute path to the plan it should run with.", args);
      }
      break;
  }
});

try {
  Assert.notEqual(args[PARAMS.CONFIG], undefined);

  if(!args[PARAMS.PLAN]) {
    Assert.notEqual(args[PARAMS.TEMPLATES], undefined);
  }

  console.log(`Running with commands: ${Util.inspect(args)}`);
  var start = Promise.coroutine(function* (configPath, inDir, templateIds, dryRun, planPath) {
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

    var encode = Promise.coroutine(function* () {
      encoder = factory.createEncoder();
      codecArgs = [templateIds,
                   inDir ? inDir : config.getConfig().dirs.encodeDir,
                   config.getConfig().dirs.mediaDir, dryRun];

      var plan;
      var planName;
      if(typeof planPath === "undefined") {
        plan = yield encoder.createPlan.apply(encoder, codecArgs);
        planName = `Plan-${process.pid}.txt`;
        yield encoder.savePlan(plan, planName);
      } else {
        plan = yield encoder.loadPlan(planPath);
        planName = planPath.split(Path.sep);
        planName = planName[planName.length - 1];
      }

      if(!dryRun) {
        if(plan) {
          yield encoder.runPlan(plan, planName);
        } else {
          throw new Error("The plan is not defined to be able to encode it.");
        }
      }
    });

    //If locking is enabled then grab file lock
    if(typeof config.getConfig().serverInfo.lockDir !== "undefined") {
      process.on("exit", (code) => {
        LockFile.unlock(Path.join(config.getConfig().serverInfo.lockDir, "video-sync-encode.lock"), console.log);
      });

      LockFile.lock(Path.join(config.getConfig().serverInfo.lockDir, "video-sync-encode.lock"), {},
        Promise.coroutine(function* (err) { err ? console.log(err) : yield encode(); }));
    } else {
      yield encode();
    }

  }).call(this,
          args[PARAMS.CONFIG],
          args[PARAMS.ENCODE_DIR],
          args[PARAMS.TEMPLATES],
          args[PARAMS.DRY_RUN] ? true : false,
          args[PARAMS.PLAN]);

} catch(e) {
  console.log("Missing required options.");
  console.log(PARAMS);
}
