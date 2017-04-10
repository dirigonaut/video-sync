var Forge      = require('node-forge');
var Moment     = require('moment');
var LogManager = require('../log/LogManager');
var Publisher  = require('../process/redis/RedisPublisher');

var publisher = new Publisher();

var self;
const EXPIR = 365;

var log = LogManager.getLog(LogManager.LogEnum.AUTHENTICATION);

function Certificate() {
  Moment().format('YYYY MM DD');
  self = this;
}

Certificate.prototype.getCertificates = function(callback) {
  log.debug("Certificate.prototype.getCertificates");
  var validateCerts = function(certs) {
    if(certs === null || certs === undefined || certs.length === 0) {
      log.info("There are no SSL Certificates, signing new ones.");
      var cert = self._generate(self._getAttributes(), callback);
    } else {
      log.info("Loading SSL Certificates.");
      var cert = certs[0];
      if(Moment().diff(cert.expire) < -1) {
        callback(cert.pem);
      } else {
        log.info("SSL Certificates are expired, signing new ones.");
        publisher.publish(Publisher.Enum.DATABASE, ['deleteCerts', [Moment().valueOf()]]);

        var cert = self._generate(self._getAttributes(), callback);
      }
    }
  }

  publisher.publish(Publisher.Enum.DATABASE, ['readCerts'], validateCerts);
};

module.exports = Certificate;

Certificate.prototype._generate = function(attrs, callback) {
  log.debug("Certificate.prototype._generate");
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
  cert.sign(keypair.privateKey);

  // now convert the Forge certificate to PEM format
  var pem = {
    privateKey: pki.privateKeyToPem(keypair.privateKey),
    publicKey: pki.publicKeyToPem(keypair.publicKey),
    certificate: pki.certificateToPem(cert)
  };

  self._save(pem, callback);
};

Certificate.prototype._getAttributes = function() {
  var attrs = [{
    name: 'commonName',
    value: 'example.org'
  }, {
    name: 'countryName',
    value: 'US'
  }, {
    shortName: 'ST',
    value: 'Virginia'
  }, {
    name: 'localityName',
    value: 'Blacksburg'
  }, {
    name: 'organizationName',
    value: 'Test'
  }, {
    shortName: 'OU',
    value: 'Test'
  }];

  return attrs;
};

Certificate.prototype._save = function(certs, callback) {
  log.debug("Certificate.prototype._save");
  var certificate = { expire: Moment().add(EXPIR, 'days').valueOf(), pem: certs };
  publisher.publish(Publisher.Enum.DATABASE, ['createCerts', [certificate]], callback);
};
