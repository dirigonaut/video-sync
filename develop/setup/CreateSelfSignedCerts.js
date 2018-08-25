const Promise    = require('bluebird');
const Fs         = Promise.promisifyAll(require('fs'));
const Forge      = require('node-forge');

const EXPIR = 365;

/*
  bits: 4048,
  attr:
    [{"name":"commonName","value":""},
    {"name":"countryName","value":""},
    {"shortName":"ST","value":""},
    {"name":"localityName","value":""},
    {"name":"organizationName","value": ""},
    {"shortName":"OU","value": ""}]
  keyPath: path/to/save/key
  certPath: path/to/save/cert
*/

var args = process.argv.slice(2);
generate.apply(this, args)
  .then(function() { console.log(`Finished running for args: ${args}`) })
  .catch(function(error) { console.log(`Error running args: ${args}`, error) });

var generate = function(bits, attr, keyPath, certPath) {
  var pki = Forge.pki;

  var keypair = pki.rsa.generateKeyPair(bits);
  var cert = pki.createCertificate();

  cert.publicKey = keypair.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  try {
    // here we set subject and issuer as the same one
    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    // the actual certificate signing
    cert.sign(keypair.privateKey, Forge.md.sha512.create());
  } catch(e) {
    throw new Error(`Unable to generate/sign new certificate. ${e.message || e}`);
  }

  var pemKey = pki.privateKeyToPem(keypair.privateKey);
  var pemCert = pki.certificateToPem(cert);
  
  verify(pemCert);

  return Promise.all([
    Fs.writeFileAsync(keyPath, pemKey),
    Fs.writeFileAsync(certPath, pemCert)
  ]);
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
