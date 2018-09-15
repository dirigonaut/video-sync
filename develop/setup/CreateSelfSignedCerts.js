const Promise    = require('bluebird');
const Fs         = Promise.promisifyAll(require('fs'));
const Forge      = require('node-forge');
const Path       = require('path');

const Config     = require('../../src/server/utils/Config.js');

const EXPIR = 365;

var getConfig = function () {
  if(process.env.VIDEO_SYNC_CONFIG) {
    if(Path.isAbsolute(process.env.VIDEO_SYNC_CONFIG)) {
      configPath = process.env.VIDEO_SYNC_CONFIG;
      var config = Object.create(Config.prototype);

      return new Promise(Promise.coroutine(function*(resolve, reject) {
        try {
          yield config.load(configPath);
          resolve(config);
        } catch (e) {
          reject(e);
        }
      }));
    } else {
      throw new Error(
        `VIDEO_SYNC_CONFIG env var is expected to be an absolute path not: ${process.env.VIDEO_SYNC_CONFIG}`);
    }
  }
};

getConfig()
.then(function(config) {
  return [
    1024,
    [{"name":"commonName","value":Math.random()},
    {"name":"countryName","value":Math.random()},
    {"shortName":"ST","value":Math.random()},
    {"name":"localityName","value":Math.random()},
    {"name":"organizationName","value":Math.random()},
    {"shortName":"OU","value":Math.random()}],
    config.getConfig().ssl.key,
    config.getConfig().ssl.crt
  ];
}).then(function(attrs) {
  console.log("Executing with the following args: ");
  console.log(attrs);
  generate.apply(this, attrs)
  .then(function() { console.log(`Generated Self Signed Certs`) })
  .catch(function(error) { console.log(`Error Generating Self Signed Certs`, error) });
});

var generate = function(bits, attrs, keyPath, certPath) {
  console.log("Generating Self Signed Certs")
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
  console.log("Verify Self Signed Certs");
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
