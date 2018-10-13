const Promise   = require('bluebird');
const Cluster   = require('cluster');
const Fs        = Promise.promisifyAll(require('fs'));
const Path      = require('path');
const Util      = require('util');

const INTERVAL  = 500;

var encoderManager, encoderFactory, encodingPlan, config, log;

function Encoder() {}

Encoder.prototype.initialize = function() {
  if(typeof Encoder.prototype.protoInit === 'undefined') {
    Encoder.prototype.protoInit = true;

    config          = this.factory.createConfig();
    encoderFactory  = this.factory.createEncoderFactory();
    encoderManager  = this.factory.createEncoderManager();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);
  }
};

Encoder.prototype.start = Promise.coroutine(function* (templateId, inDir, outDir, dry) {
  log.debug('Encoder.start', arguments);
  encodingPlan = yield encoderFactory.createPlan(templateId, inDir, outDir);

  if(dry) {
    yield savePlan();
    return new Promise.resolve();
  } else {
    encoderManager.encode(encodingPlan);
    var intervalId = setInterval(savePlan, INTERVAL);

    return new Promise(function(resolve, reject) {
      encoderManager.on('finished', Promise.coroutine(function* () {
        log.debug('Encoder.finished',
          Path.join(config.getConfig().dirs.encodeLogDir, `Plan-${process.pid}.txt`));

        clearInterval(intervalId);
        yield savePlan(config.getConfig().dirs.encodeLogDir);
        resolve();
      }));
    });
  }
});

module.exports = Encoder;

var savePlan = Promise.coroutine(function* () {
  var planPath = Path.join(config.getConfig().dirs.encodeLogDir, `Plan-${process.pid}.txt`);
  yield Fs.writeFileAsync(planPath, Util.inspect(encodingPlan, { showHidden: false, depth: null}));
});
