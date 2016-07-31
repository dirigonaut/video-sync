var SelfSigned = require('selfsigned');
var Moment = require('moment');
var NeDatabase = require('../database/NeDatabase');

var database  = new NeDatabase();
var self;
const EXPIR = 365;

function Certificate() {
  Moment().format('YYYY MM DD');
  self = this;
}

Certificate.prototype.getCertificates = function(callback) {
  console.log("Certificate.prototype.getCertificates");
  var validateCerts = function(certs) {
    if(certs == null || certs == undefined || certs.length == 0) {
      console.log("There are no SSL Certificates, signing new ones.");
      var cert = self._generate();
      self._save(cert, callback);
    } else {
      console.log("Loading SSL Certificates.");
      var cert = certs[0];
      if(Moment().diff(cert.expire) < -1) {
        callback(cert);
      } else {
        console.log("SSL Certificates are expired, signing new ones.");
        database.deleteCerts(Moment().valueOf());

        var cert = self._generate();
        self._save(cert, callback);
      }
    }
  }
  database.readCerts(validateCerts);
};

Certificate.prototype._generate = function() {
  console.log("Certificate.prototype._generate");
  return SelfSigned.generate(null, { keySize: 2048, days: EXPIR, algorithm: 'sha256' });
};

Certificate.prototype._save = function(certs, callback) {
  var certificate = {expire: Moment().add(EXPIR, 'days').valueOf(), certificate: certs};
  database.createCerts(certificate, callback);
};

module.exports = Certificate;
