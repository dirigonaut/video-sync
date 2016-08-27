var Forge = require('node-forge');
var Moment = require('moment');
var NeDatabase = require('../database/NeDatabase');

var self;
const EXPIR = 365;

var database = new NeDatabase();

function Certificate() {
  Moment().format('YYYY MM DD');
  self = this;
}

Certificate.prototype.getCertificates = function(callback) {
  console.log("Certificate.prototype.getCertificates");
  var validateCerts = function(certs) {
    if(certs == null || certs == undefined || certs.length == 0) {
      console.log("There are no SSL Certificates, signing new ones.");
      var cert = self._generate(null, callback);
    } else {
      console.log("Loading SSL Certificates.");
      var cert = certs[0];
      if(Moment().diff(cert.expire) < -1) {
        callback(cert.pem);
      } else {
        console.log("SSL Certificates are expired, signing new ones.");
        database.deleteCerts(Moment().valueOf());

        var cert = self._generate(null, callback);
      }
    }
  }
  database.readCerts(validateCerts);
};

Certificate.prototype._generate = function(attrs, callback) {
  console.log("Certificate.prototype._generate");
  var pki = Forge.pki;

  var keypair = pki.rsa.generateKeyPair(2048);
  var cert = pki.createCertificate();

  // fill the required fields
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  // use your own attributes here, or supply a csr (check the docs)
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

Certificate.prototype._save = function(certs, callback) {
  var certificate = {expire: Moment().add(EXPIR, 'days').valueOf(), pem: certs};
  database.createCerts(certificate, callback);
};

module.exports = Certificate;
