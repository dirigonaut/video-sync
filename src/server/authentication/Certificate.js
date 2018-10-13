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
  } else {
    verify(pem.crt);
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

var verify = function (pem) {
  log.debug("Certificate._verify");
  var caStore = Forge.pki.createCaStore();
  var cert;

  try {
    cert = Forge.pki.certificateFromPem(pem, true);
  } catch (e) {
    throw new Error ('Failed to convert certificate (' + e.message || e + ')');
  }

  try {
    caStore.addCertificate(cert);
  } catch (e) {
    throw new Error ('Failed to load CA certificate (' + e.message || e + ')');
  }

  try {
    Forge.pki.verifyCertificateChain(caStore, [ cert ]);
  } catch (e) {
    throw new Error ('Failed to verify certificate (' + e.message || e + ')');
  }
};
