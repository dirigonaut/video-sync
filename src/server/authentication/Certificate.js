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

Certificate.prototype.getCertificates = Promise.coroutine(function* () {
  log.debug("Certificate.getCertificates");
  var cert = yield Fs.readFileAsync(config.getCertificatePath())
  .catch(function(err) {
    log.error(err);
    return undefined;
  }.bind(this));

  if(typeof cert === 'undefind' || !cert) {
    log.info("There are no SSL Certificates, signing new ones.");
    var attributes = config.getConfig().certificate ? config.getConfig().certificate.attributes : '';
    cert = yield generate(attributes);
  } else {
    log.info("Loading SSL Certificates.");
    cert = JSON.parse(cert);

    if(Moment().diff(cert.expire) >= -1) {
      log.info("SSL Certificates are expired, signing new ones.");

      cert = yield generate.call(this, getAttributes());
    }
  }

  return cert.pem;
});

module.exports = Certificate;

var generate = function(attrs) {
  log.debug("Certificate._generate");
  var pki = Forge.pki;

  var keypair = pki.rsa.generateKeyPair(2048);
  var cert = pki.createCertificate();

  // fill the required fields
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  // here we set subject and issuer as the same one
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // the actual certificate signing
  cert.sign(keypair.privateKey, Forge.md.sha512.create());

  // now convert the Forge certificate to PEM format
  var pem = {
    privateKey: pki.privateKeyToPem(keypair.privateKey),
    publicKey: pki.publicKeyToPem(keypair.publicKey),
    certificate: pki.certificateToPem(cert)
  };

  return save.call(this, pem);
};

var save = function (certs) {
  log.debug("Certificate.prototype.save");
  var certificate = { expire: Moment().add(EXPIR, 'days').valueOf(), pem: certs };
  return Fs.writeFileAsync(config.getCertificatePath(), JSON.stringify(certificate))
  .then(function() {
    return certificate;
  });
};
