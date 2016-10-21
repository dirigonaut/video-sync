var NeDatabase	= require("../database/NeDatabase");

var database      = new NeDatabase();
var activeSession = null;
var mediaPath     = null;
var mediaStarted  = false;
var adminId       = null;

var localIp       = null;

function Session() {

}

Session.prototype.loadSession = function(id) {
  var setSession = function(session) {
    activeSession = session[0];
    console.log(activeSession);
  }

  database.readSession(id, setSession);
};

Session.prototype.getActiveSession = function() {
  return activeSession;
};

Session.prototype.getInvitee = function(id, session) {
  for(var x in session.invitees) {
    if(session.invitees[x] == id) {
      return session.invitees[x];
    }
  }
};

Session.prototype.addInvitee = function(id, session) {
  session.invitees.push(id);
};

Session.prototype.removeInvitee = function(id, session) {
  for(var x in session.invitees) {
    if(session.invitees[x] == id) {
      session.invitees.slice(x, 1);
    }
  }
};

Session.prototype.mediaStarted = function() {
  if(mediaPath !== null && !mediaStarted) {
    mediaStarted = true;
  }
};

Session.prototype.getMediaStarted = function() {
  return mediaStarted;
};

Session.prototype.setMediaPath = function(path) {
  mediaPath = path;
  mediaStarted = false;
};

Session.prototype.getMediaPath = function() {
  return mediaPath;
};

Session.prototype.isAdmin = function(id) {
  return adminId == id;
};

Session.prototype.getAdmin = function() {
  return adminId;
};

Session.prototype.setAdminId = function(id) {
  if(adminId == null) {
    console.log("AdminId: " + id);
    adminId = id;
  }
};

Session.prototype.setLocalIp = function(ip) {
  localIp = ip;
};

Session.prototype.getLocalIp = function() {
  return localIp;
};

module.exports = Session;
