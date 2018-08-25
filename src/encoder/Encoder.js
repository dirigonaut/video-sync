const Promise   = require('bluebird');
const Cluster   = require('cluster');
const Fs        = Promise.promisifyAll(require('fs'));
const Path      = require('path');

const INTERVAL  = 500;

var encoderManager, encoderFactory, encodingPlan, log;

function EncoderProcess() {}

Encoder.prototype.initialize = function() {
  if(typeof EncoderFactory.prototype.protoInit === 'undefined') {
    EncoderFactory.prototype.protoInit = true;
    Object.setPrototypeOf(EncoderProcess.prototype, Events.prototype);

    encoderFactory  = this.factory.createEncoderFactory();
    encoderManager  = this.factory.createEncoderManager();
  }
};

Encoder.prototype.start = function(quality, inDir, outDir) {
  encodingPlan = createEncodingPlan(quality, inDir, outDir);
  encoderManager.encode(encodingPlan);
  var intervalId = savePlanInterval();

  return new Promise(resolve, reject) {
    encoderManager.on('finished', function() {
      clearInterval(intervalId);
      resolve();
    });
  });
};

module.exports = Encoder;

var savePlanInterval = function(dir) {
  var planPath = Path.join(dir, `Plan-${process.pid}.txt`);
  return setInterval(Promise.coroutine(function* () {
    yield Fs.writeFileAsync(planPath, toJSON(encoderManager.getPlan()));
  }.bind(this)), INTERVAL);
};
