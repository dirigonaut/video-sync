var details = null;

function Session(path) {
  details = new Object();
  details.baseDir = path;
}

Session.prototype.initialize = function(sessionId) {
  //load from DB
};

Session.prototype.getDetails = function() {
  return details;
};

Session.prototype.saveSession = function() {

};

Session.prototype.deleteSession = function() {

};

module.exports = Session;
