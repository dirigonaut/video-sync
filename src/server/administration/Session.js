var Redis         = require("redis");
var Cache         = require('../utils/Cache');
var LogManager    = require('../log/LogManager');
var Publisher     = require('../process/redis/RedisPublisher');

var log           = LogManager.getLog(LogManager.LogEnum.ADMINISTRATION);
var cache         = new Cache();
var publisher 		= new Publisher();
var client        = Redis.createClient();

function Session() {
}

Session.prototype.setSession = function(id) {
  log.debug("Session.setActiveSession");
  _this = this;

  var setSession = function(session) {
    var handleResult = function(result) {
      var invitees = [];
      for(var i in session[0].invitees) {
        var invitee = {};
        invitee.id = null;
        invitee.email = session[0].invitees[i];
        invitee.pass = null;

        invitees.push(invitee);
      }

      _this.setInvitees(invitees);
    };

    setSessionData(Session.Enum.ACTIVE, session[0], handleResult);
  };

  publisher.publish(Publisher.Enum.DATABASE, ['readSession', [id]], setSession);
};

Session.prototype.getSession = function(callback) {
  log.debug("Session.getActiveSession");
  getSessionData(Session.Enum.ACTIVE, callback);
};

Session.prototype.getInvitees = function(callback) {
  log.debug("Session.getInvitees");
  getSessionData(Session.Enum.USERS, callback);
};

Session.prototype.setInvitees = function(invitees) {
  log.debug("Session.setInvitees");
  setSessionData(Session.Enum.USERS, invitees, undefined);
};

Session.prototype.addInvitee = function(email) {
  log.debug("Session.addInvitee");
  _this = this;

  var invitee = {};
  invitee.id = null;
  invitee.email = email;
  invitee.pass = null;

  var handleResult = function(results) {
    var invitees = results;
    var found = false;
    for(var i in invitees) {
      if(email === invitees.email) {
        log.warn(`User ${email} already is in the session.`);
        found = true;
        break;
      }
    }

    if(!found) {
      invitees.push(invitee);
      _this.setInvitees(invitees);
    }
  };

  this.getInvitees(handleResult);
};

Session.prototype.removeInvitee = function(id, callback) {
  log.debug("Session.removeInvitee");
  _this = this;

  var handleResults = function(result) {
    var invitees = result;

    if(invitees !== null && invitees !== undefined) {
      for(var i in invitees) {
        if(invitees[i] === id) {
          invitees.splice(i, 1);
          _this.setInvitees(invitees);
          callback();
          break;
        }
      }
    } else {
      log.warn("There is no user with the id: ", id);
    }
  };

  this.getInvitees(handleResults);
};

Session.prototype.setMediaStarted = function(started) {
  log.silly("Session.setMediaStarted");
  var checkMediaPathSet = function(basePath) {
    if(basePath !== null && basePath !== undefined && basePath.length > 0) {
      setSessionData(Session.Enum.STARTED, started, undefined);
    }
  };

  this.getMediaPath(checkMediaPathSet);
};

Session.prototype.getMediaStarted = function(callback) {
  log.silly("Session.getMediaStarted");
  getSessionData(Session.Enum.STARTED, callback);
};

Session.prototype.setMediaPath = function(path) {
  log.info("Session.setMediaPath");
  _this = this;
  var handleResult = function(result) {
    _this.setMediaStarted(false);
    cache.setPath(path);
  };

  setSessionData(Session.Enum.MEDIA, path, handleResult);
};

Session.prototype.getMediaPath = function(callback) {
  log.debug("Session.getMediaPath");
  getSessionData(Session.Enum.MEDIA, callback);
};

Session.prototype.isAdmin = function(id, callback) {
  log.debug("Session.isAdmin");
  var compareResults = function(result) {
    callback(result === id);
  };

  getSessionData(Session.Enum.ADMIN, compareResults);
};

Session.prototype.getAdmin = function(callback) {
  getSessionData(Session.Enum.ADMIN, callback);
};

Session.prototype.addAdmin = function(id) {
  log.info("Session.setAdmin");
  setSessionData(Session.Enum.ADMIN, id, undefined);
};

Session.prototype.removeAdmin = function(id) {
  log.info("Session.removeAdmin");
  setSessionData(Session.Enum.ADMIN, id, undefined);
};

Session.prototype.setIP = function(ip) {
  log.info("Session.setIP");
  setSessionData(Session.Enum.IP, ip, undefined);
};

Session.prototype.getIP = function(callback) {
  log.info("Session.getIP");
  getSessionData(Session.Enum.IP, callback);
};

module.exports = Session;

Session.Enum = { ACTIVE: "session-active", MEDIA: "session-media", ADMIN: "session-admin", IP: "session-ip", STARTED: "session-started", USERS: "session-users"};

var setSessionData = function(key, data, callback) {
  log.debug('setSessionData for key: ', key);
  client.set(key, JSON.stringify(data), callback);
};

var getSessionData = function(key, callback) {
  log.debug('getSessionData for key:', key);
  client.get(key, function(err, result) {
    log.debug(`getSessionData ${key} result:`, result);
    if(err) {
      log.error(err);
    } else {
      callback(JSON.parse(result));
    }
  });
};
