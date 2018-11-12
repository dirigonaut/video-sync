const Promise   = require("bluebird");
const Cluster   = require("cluster");
const Fs        = Promise.promisifyAll(require("fs"));
const Path      = require("path");

const INTERVAL  = 500;

var encoderManager, encoderFactory, config, log;

function Encoder() {}

Encoder.prototype.initialize = function() {
  if(typeof Encoder.prototype.protoInit === "undefined") {
    Encoder.prototype.protoInit = true;

    config          = this.factory.createConfig();
    encoderFactory  = this.factory.createEncoderFactory();
    encoderManager  = this.factory.createEncoderManager();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);
  }
};

Encoder.prototype.createPlan = function(templateId, inDir, outDir, dry) {
  log.debug("Encoder.createPlan", arguments);
  return encoderFactory.createPlan(templateId, inDir, outDir);
};

Encoder.prototype.loadPlan = Promise.coroutine(function* (planPath) {
  log.debug("Encoder.loadPlan", arguments);
  var plan;

  try {
    plan = yield Fs.readFileAsync(planPath);
    plan = encoderFactory.parse(plan.toString());
    plan = Promise.resolve(plan);
  } catch(e) {
    log.error("Failed loading the plan.", e);
    plan = Promise.reject(e);
  }

  return plan;
});

Encoder.prototype.savePlan = Promise.coroutine(function* (plan, planName) {
  log.debug("Encoder.savePlan");
  var planPath = Path.join(config.getConfig().dirs.encodeLogDir, planName);
  yield Fs.writeFileAsync(planPath, plan.stringify());
});

Encoder.prototype.runPlan = Promise.coroutine(function* (plan, planName) {
  log.debug("Encoder.runPlan");
  encoderManager.encode(plan);

  var intervalId = setInterval(function() {
    this.savePlan(plan, planName)}.bind(this), INTERVAL);

  return new Promise(function(resolve, reject) {
    encoderManager.on("finished", Promise.coroutine(function* (finalPlan) {
      log.debug("Encoder.finished",
        Path.join(config.getConfig().dirs.encodeLogDir, planName));

      clearInterval(intervalId);
      yield this.savePlan(finalPlan, planName);
      resolve();
    }.bind(this)));
  }.bind(this));
});

module.exports = Encoder;
