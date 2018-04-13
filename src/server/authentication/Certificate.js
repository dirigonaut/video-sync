const Promise    = require('bluebird');
const Fs         = Promise.promisifyAll(require('fs'));
const Forge      = require('node-forge');
const Moment     = require('moment');

const EXPIR = 365;

var config, log;

function Certificate() { }

Certificate.prototype.initialize = function(force) {
  if(typeof Certificate.prototype.protoInit === 'undefined') {
    Certificate.prototype.protoInit = true;
    Moment().format('YYYY MM DD');
    config          = this.factory.createConfig();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.AUTHENTICATION);
  }
};

Certificate.prototype.getCertificate = Promise.coroutine(function* () {
  log.debug("Certificate.getCertificate");
  var pem = yield load();

  if(!pem) {
    log.info("There are no valid SSL Certificates, self signing new ones.");
    pem = yield generate();
  } else {
    verify(pem.crt);
  }

  return pem;
});

module.exports = Certificate;

var generate = function() {
  log.debug("Certificate._generate");
  var pki = Forge.pki;

  var keypair = pki.rsa.generateKeyPair(2048);
  var cert = pki.createCertificate();

  cert.publicKey = keypair.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  try {
    // here we set subject and issuer as the same one
    var attrs = config.getConfig().ssl.attributes;
    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    // the actual certificate signing
    cert.sign(keypair.privateKey, Forge.md.sha512.create());
  } catch(e) {
    throw new Error(`Unable to generate/sign new certificate. ${e.message || e}`);
  }

  return Promise.all([
    Fs.writeFileAsync(config.getCertificatePath(), pki.privateKeyToPem(keypair.privateKey)),
    Fs.writeFileAsync(config.getKeyPath(), pki.certificateToPem(cert))
  ]);
};

var load = function (path) {
  log.debug("Certificate._load", path);
  return Promise.all([
    Fs.readFileAsync(config.getCertificatePath()),
    Fs.readFileAsync(config.getKeyPath())
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
