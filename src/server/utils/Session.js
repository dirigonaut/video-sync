var NeDatabase	= require("../database/NeDatabase");

var database      = new NeDatabase();
var activeSession = null;
var mediaPath     = null;
var adminId       = null;

function Session() {

}

Session.prototype.createSession = function(id) {
  var newSession = new Object();

  newSession.id           = id;
  newSession.smtp         = null;
  newSession.invitees     = [];
  newSession.mailOptions  = null;
  newSession.mediaPath    = null;

  return newSession;
}

Session.prototype.loadSession = function(id) {
  var setSession = function(session) {
    activeSession = session;
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

Session.prototype.removeInvitee = function(id, session) {
  for(var x in session.invitees) {
    if(session.invitees[x] == id) {
      session.invitees.slice(x, 1);
    }
  }
};

Session.prototype.setMediaPath = function(path) {
  mediaPath = path;
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

module.exports = Session;
