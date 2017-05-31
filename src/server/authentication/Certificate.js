const Promise    = require('bluebird');
const Forge      = require('node-forge');
const Moment     = require('moment');
const LogManager = require('../log/LogManager');
const Publisher  = require('../process/redis/RedisPublisher');

const EXPIR = 365;

var log = LogManager.getLog(LogManager.LogEnum.AUTHENTICATION);
var publisher;

function lazyInit() {
  publisher = new Publisher();
  Moment().format('YYYY MM DD');
}

class Certificate {
  constructor() {
    if(typeof Certificate.prototype.lazyInit === 'undefined') {
      lazyInit();
      Certificate.prototype.lazyInit = true;
    }
  }
}

Certificate.prototype.getCertificates = Promise.coroutine(function* () {
  log.debug("Certificate.prototype.getCertificates");
  var certs = yield publisher.publishAsync(Publisher.Enum.DATABASE, ['readCerts']);
  console.log(`${process.pid}`);
  console.log(certs);

  if(typeof certs === 'undefind' || !certs) {
    log.info("There are no SSL Certificates, signing new ones.");
    cert = yield generate(getAttributes());
  } else {
    log.info("Loading SSL Certificates.");
    cert = certs[0];

    if(Moment().diff(cert.expire) >= -1) {
      log.info("SSL Certificates are expired, signing new ones.");
      yield publisher.publishAsync(Publisher.Enum.DATABASE, ['deleteCerts', [Moment().valueOf()]]);

      certs = yield generate(getAttributes());
    }
  }

  return cert;
});

module.exports = Certificate;

var generate = function(attrs) {
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

  return save(pem);
};

var getAttributes = function() {
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

var save = function (certs) {
  log.debug("Certificate.prototype.save");
  var certificate = { expire: Moment().add(EXPIR, 'days').valueOf(), pem: certs };
  return publisher.publishAsync(Publisher.Enum.DATABASE, ['createCerts', [certificate]]);
};
