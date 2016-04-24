var details = null;

function Session() {
  details = new Object();
  details.baseDir = "/home/sabo-kun/repo/video-sync-2/static/media/bunny/";
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
