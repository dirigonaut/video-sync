const EventEmitter  = require('events');

var PlayerManager   = require('../player/PlayerManager');
var NeDatabase	    = require('../database/NeDatabase');
var LogManager      = require('../log/LogManager');

var log           = LogManager.getLog(LogManager.LogEnum.ADMINISTRATION);
var database      = new NeDatabase();
var playerManager = new PlayerManager();

var activeSession = null;
var mediaPath     = null;
var mediaStarted  = false;
var adminId       = null;
var idToEmailMap  = null;

var localIp       = null;

var emitter = null;

function Session() {
}

Session.prototype.loadSession = function(id) {
  log.debug("Session.loadSession");
  var setSession = function(session) {
    activeSession = session[0];
    idToEmailMap = new Map();
    log.info("Loaded session",activeSession);
  }

  database.readSession(id, setSession);
};

Session.prototype.getActiveSession = function() {
  return activeSession;
};

Session.prototype.getInvitee = function(id, session) {
  log.debug("Session.getInvitees");
  for(var x in session.invitees) {
    if(session.invitees[x] == id) {
      log.silly("Invitee found at entry", x);
      return session.invitees[x];
    }
  }
};

Session.prototype.addInvitee = function(email, session) {
  log.silly("Session.addInvitee");
  if(session !== null && session !== undefined) {
    session.invitees.push(email);
  } else {
    log.error("There is no active session to add invitees to.");
  }
};

Session.prototype.associateIdToEmail = function(id, email) {
  idToEmailMap.set(id, email);
};

Session.prototype.removeInvitee = function(id, session) {
  log.debug("Session.removeInvitee");
  if(idToEmailMap !== null && idToEmailMap !== undefined) {
    var email = idToEmailMap.get(id);

    if(email !== null && email !== undefined) {
      for(var x in session.invitees) {
        if(session.invitees[x] === email) {
          session.invitees.splice(x, 1);
          idToEmailMap.delete(id);
          console.log(session.invitees);
        }
      }
    } else {
      log.error("There is no use with the this id: ", id);
    }
  } else {
    log.error("There is no active session to remove invitees from.");
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
  log.info("Session.setMediaPath")
  mediaPath = path;
  mediaStarted = false;

  playerManager.initPlayers();
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

Session.prototype.onAdminIdCallback = function(callback) {
  log.debug("Session.onAdminIdCallback");
  if(emitter === null || emitter === undefined) {
    emitter = new EventEmitter();
  }

  emitter.once('admin-set', callback);
};

Session.prototype.setAdminId = function(id) {
  log.debug("AdminId: " + id);
  adminId = id;
  emitter.emit('admin-set', id);
};

Session.prototype.setLocalIp = function(ip) {
  localIp = ip;
};

Session.prototype.getLocalIp = function() {
  return localIp;
};

module.exports = Session;
