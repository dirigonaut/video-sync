const EventEmitter = require('events');

var Publisher     = require('../process/redis/RedisPublisher');
var LogManager    = require('../log/LogManager');

var publisher     = new Publisher();
var log           = LogManager.getLog(LogManager.LogEnum.ADMINISTRATION);

var activeSession = null;
var mediaPath     = null;
var adminId       = null;
var idToEmailMap  = null;
var localIp       = null;
var mediaStarted  = false;

var emitter = null;

function Session() {
}

Session.prototype.loadSession = function(id) {
  log.debug("Session.loadSession");
  var setSession = function(session) {
    activeSession = session[0];
    idToEmailMap = new Map();
    log.info("Loaded session",activeSession);
    publisher.publish(Publisher.Enum.SESSION, ['redisSetSession', [session]]);
  }

  publisher.publish(Publisher.Enum.DATABASE, ['readSession', [id]], setSession);
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
    publisher.publish(Publisher.Enum.SESSION, ['redisSetInvitees', [session.invitees]]);
  } else {
    log.error("There is no active session to add invitees to.");
  }
};

Session.prototype.associateIdToEmail = function(id, email) {
  idToEmailMap.set(id, email);
  publisher.publish(Publisher.Enum.SESSION, ['redisSetIdToEmailMap', [idToEmailMap]]);
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

          publisher.publish(Publisher.Enum.SESSION, ['redisSetInvitees', [session.invitees]]);
          publisher.publish(Publisher.Enum.SESSION, ['redisSetIdToEmailMap', [idToEmailMap]]);
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
    publisher.publish(Publisher.Enum.SESSION, ['redisSetMediaStarted', []]);
  }
};

Session.prototype.getMediaStarted = function() {
  return mediaStarted;
};

Session.prototype.setMediaPath = function(path) {
  log.info("Session.setMediaPath");
  mediaPath = path;
  mediaStarted = false;

  publisher.publish(Publisher.Enum.SESSION, ['redisSetMediaPath', [path]]);
};

Session.prototype.getMediaPath = function() {
  return mediaPath;
};

Session.prototype.isAdmin = function(id) {
  return adminId === id;
};

Session.prototype.getAdmin = function() {
  return adminId;
};

Session.prototype.onAdminIdCallback = function(callback) {
  log.debug("Session.onAdminIdCallback");
  if(emitter === null || emitter === undefined) {
    emitter = new EventEmitter();
  }

  emitter.on('admin-set', callback);
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

//--------- Redis Functions ---------
Session.prototype.redisSetAdminId = function(id) {
  this.setAdminId(id);
};

Session.prototype.redisSetSession = function(session) {
  activeSession = session[0];
  idToEmailMap = new Map();
  log.info("Loaded session", activeSession);
};

Session.prototype.redisSetInvitees = function(invitees) {
  if(session !== null && session !== undefined) {
    session.invitees = invitees;
  }
};

Session.prototype.redisSetIdToEmailMap = function(emailMap) {
  idToEmailMap = emailMap;
};

Session.prototype.redisSetMediaPath = function(path) {
  log.info("Session.redisSetMediaPath");
  mediaPath = path;
  mediaStarted = false;
};

Session.prototype.redisSetMediaStarted = function() {
  this.mediaStarted();
};

module.exports = Session;
