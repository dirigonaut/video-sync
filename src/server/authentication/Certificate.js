const Promise    = require('bluebird');
const Fs         = Promise.promisifyAll(require('fs'));
const Forge      = require('node-forge');

const EXPIR = 365;

var config, log;

function Certificate() { }

Certificate.prototype.initialize = function(force) {
  if(typeof Certificate.prototype.protoInit === 'undefined') {
    Certificate.prototype.protoInit = true;
    config          = this.factory.createConfig();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.AUTHENTICATION);
  }
};

Certificate.prototype.getCertificate = Promise.coroutine(function* () {
  log.debug("Certificate.getCertificate");
  var pem = yield load();

  if(!pem) {
    throw new Error("There are no valid SSL Certificates.");
  }

  return pem;
});

module.exports = Certificate;

var load = function (path) {
  log.debug("Certificate._load", path);
  return Promise.all([
    Fs.readFileAsync(config.getConfig().ssl.key),
    Fs.readFileAsync(config.getConfig().ssl.crt)
  ]).then(function(result) {
    if(result.length === 2) {
      return {
        crt: result[1].toString(),
        key: result[0].toString()
      }
    }
  }).catch(function(error) {
    log.error(`Error loading certificate: ${error}`);
  });
};
