var details = null;

function Preferences() {
  details = new Object();
  details.exportDir = "/home/sabo-kun/repo/video-sync-2/static/media/";
}

Preferences.prototype.initialize = function() {
  //load from DB
};

Preferences.prototype.getDetails = function() {
  return details;
};

Preferences.prototype.savePreferences = function() {

};

Preferences.prototype.deletePreferences = function() {

};

module.exports = Preferences;
