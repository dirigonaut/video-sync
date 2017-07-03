const Promise = require('bluebird');
const Redis   = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

var publisher, client, config, database, log;

function Session() { }

Session.prototype.initialize = function(force) {
  if(typeof Session.prototype.protoInit === 'undefined') {
    Session.prototype.protoInit = true;
    config          = this.factory.createConfig();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ADMINISTRATION);
  }

  if(force === undefined ? typeof Session.prototype.stateInit === 'undefined' : force) {
    Session.prototype.stateInit = true;
    client      = Redis.createClient(config.getConfig().redis);
    publisher   = this.factory.createRedisPublisher();
    database    = this.factory.createNeDatabase(false);
  }
};

Session.prototype.setSession = Promise.coroutine(function* (id) {
  log.debug("Session.setActiveSession");
  var session = yield publisher.publishAsync(publisher.Enum.DATABASE, [database.functions.READSESSION, [id]]).then(function(data) {
    return data[0];
  });

  yield setSessionData(Session.Enum.ACTIVE, session);

  var invitees = [];
  for(let i = 0; i < session.invitees.length; ++i) {
    var invitee = { };
    invitee.id = null;
    invitee.email = session.invitees[i];
    invitee.pass = null;
    invitees.push(invitee);
  }

  yield this.setInvitees(invitees);
});

Session.prototype.getSession = function() {
  log.debug("Session.getActiveSession");
  return getSessionData.call(this, Session.Enum.ACTIVE);
};

Session.prototype.getInvitees = function() {
  log.debug("Session.getInvitees");
  return getSessionData.call(this, Session.Enum.USERS);
};

Session.prototype.setInvitees = function(invitees) {
  log.debug("Session.setInvitees");
  return setSessionData(Session.Enum.USERS, invitees);
};

Session.prototype.addInvitee = Promise.coroutine(function* (email) {
  log.debug("Session.addInvitee");

  var invitee = {};
  invitee.id = null;
  invitee.email = email;
  invitee.pass = null;

  var invitees = yield this.getInvitees();
  if(typeof invitees !== 'undefined' && invitees) {
    var found = false;
    for(let i = 0; i < invitees.length; ++i) {
      if(email === invitees.email) {
        return new Promise.reject(new Error(`User ${email} already is in the session.`));
      }
    }

    if(!found) {
      invitees.push(invitee);
      return this.setInvitees(invitees);
    }
  }

  return new Promise.reject(new Error(`Session is not set.`));
});

Session.prototype.removeInvitee = Promise.coroutine(function* (id) {
  log.debug("Session.removeInvitee");
  var invitees = yield this.getInvitees();

  if(typeof invitees !== 'undefined' && invitees) {
    for(let i = 0; i < invitees.length; ++i) {
      if(invitees[i].email === id) {
        invitees.splice(i, 1);
        return this.setInvitees(invitees);
      }
    }

    return new Promise.reject(new Error(`There is no user with the this id: ${id}`));
  }

  return new Promise.reject(new Error(`Session is not set`));
});

Session.prototype.setMediaStarted = Promise.coroutine(function* (started) {
  log.silly("Session.setMediaStarted");
  var basePath = yield this.getMediaPath();
  if(typeof basePath !== 'undefined' && basePath) {
    return setSessionData(Session.Enum.STARTED, started);
  }

  return new Promise.reject(new Error("Media is not defined."));
});

Session.prototype.getMediaStarted = function() {
  log.silly("Session.getMediaStarted");
  return getSessionData.call(this, Session.Enum.STARTED);
};

Session.prototype.setMediaPath = Promise.coroutine(function* (path) {
  log.info("Session.setMediaPath");
  return setSessionData(Session.Enum.MEDIA, path)
  .then(function(results) {
    return this.setMediaStarted(false);
  }.bind(this));
});

Session.prototype.getMediaPath = function() {
  log.debug("Session.getMediaPath");
  return getSessionData.call(this, Session.Enum.MEDIA);
};

Session.prototype.isAdmin = Promise.coroutine(function* (id) {
  log.debug("Session.isAdmin");
  var adminList = yield getSessionData.call(this, Session.Enum.ADMIN);

  if(typeof adminList !== 'undefined' && adminList) {
    for(let i = 0; i < adminList.length; ++i) {
      if(adminList[i] === id) {
        return true;
      }
    }
  }

  return false;
});

Session.prototype.getAdmin = function () {
  return getSessionData.call(this, Session.Enum.ADMIN);
};

Session.prototype.addAdmin = Promise.coroutine(function* (id) {
  log.info("Session.setAdmin");
  var adminList = yield this.getAdmin();

  if(typeof adminList === 'undefined' || !adminList) {
      adminList = [];
  }

  adminList.push(id);
  return setSessionData(Session.Enum.ADMIN, adminList);
});

Session.prototype.removeAdmin = Promise.coroutine(function* (id) {
  log.info("Session.removeAdmin");
  var adminList = yield this.getAdmin();

  if(typeof adminList !== 'undefined' && adminList) {
    for(let i = 0; i < adminList.length; ++i) {
      if(adminList[i] === id) {
        adminList.splice(i, 1);
        return setSessionData(Session.Enum.ADMIN, adminList);
      }
    }
  }
});

module.exports = Session;

Session.Enum = { ACTIVE: "session-active", MEDIA: "session-media", ADMIN: "session-admin", IP: "session-ip", STARTED: "session-started", USERS: "session-users"};

var setSessionData = function(key, data) {
  log.silly('setSessionData for key: ', key);
  return client.setAsync(key, JSON.stringify(data));
};

var getSessionData = function(key) {
  log.silly('getSessionData for key:', key);
  return client.getAsync(key).then(function(results) {
    return JSON.parse(results);
  });
};
