const Promise       = require('bluebird');
const Redis         = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

var publisher, client;

function Session() { }

Session.prototype.initialize = function() {
  if(typeof Session.prototype.lazyInit === 'undefined') {
    publisher 		= this.factory.createRedisPublisher();
    client        = Redis.createClient(this.config.getConfig().redis);
    Session.prototype.lazyInit = true;
  }
};

Session.prototype.setSession = Promise.coroutine(function* (id) {
  this.log.debug("Session.setActiveSession");
  var session = yield publisher.publishAsync(Publisher.Enum.DATABASE, ['readSession', [id]]);
  yield setSessionData.call(this, Session.Enum.ACTIVE, session);

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
  this.log.debug("Session.getActiveSession");
  return getSessionData.call(this, Session.Enum.ACTIVE);
};

Session.prototype.getInvitees = function() {
  this.log.debug("Session.getInvitees");
  return getSessionData.call(this, Session.Enum.USERS);
};

Session.prototype.setInvitees = function(invitees) {
  this.log.debug("Session.setInvitees");
  return setSessionData.call(this, Session.Enum.USERS, invitees);
};

Session.prototype.addInvitee = Promise.coroutine(function* (email) {
  this.log.debug("Session.addInvitee");

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
  this.log.debug("Session.removeInvitee");
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
  this.log.silly("Session.setMediaStarted");
  var basePath = yield this.getMediaPath();
  if(typeof basePath !== 'undefined' && basePath) {
    return setSessionData.call(this, Session.Enum.STARTED, started);
  }

  return new Promise.reject(new Error("Media is not defined."));
});

Session.prototype.getMediaStarted = function() {
  this.log.silly("Session.getMediaStarted");
  return getSessionData.call(this, Session.Enum.STARTED);
};

Session.prototype.setMediaPath = Promise.coroutine(function* (path) {
  this.log.info("Session.setMediaPath");
  return setSessionData(Session.Enum.MEDIA, path)
  .then(function(results) {
    return this.setMediaStarted(false);
  }.bind(this));
});

Session.prototype.getMediaPath = function() {
  this.log.debug("Session.getMediaPath");
  return getSessionData.call(this, Session.Enum.MEDIA);
};

Session.prototype.isAdmin = Promise.coroutine(function* (id) {
  this.log.debug("Session.isAdmin");
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
  this.log.info("Session.setAdmin");
  var adminList = yield this.getAdmin();

  if(typeof adminList === 'undefined' || !adminList) {
      adminList = [];
  }

  adminList.push(id);
  return setSessionData.call(this, Session.Enum.ADMIN, adminList);
});

Session.prototype.removeAdmin = Promise.coroutine(function* (id) {
  this.log.info("Session.removeAdmin");
  var adminList = yield this.getAdmin();

  if(typeof adminList !== 'undefined' && adminList) {
    for(let i = 0; i < adminList.length; ++i) {
      if(adminList[i] === id) {
        adminList.splice(i, 1);
        return setSessionData.call(this, Session.Enum.ADMIN, adminList);
      }
    }
  }
});

module.exports = Session;

Session.Enum = { ACTIVE: "session-active", MEDIA: "session-media", ADMIN: "session-admin", IP: "session-ip", STARTED: "session-started", USERS: "session-users"};

var setSessionData = function(key, data) {
  this.log.debug('setSessionData for key: ', key);
  return client.setAsync(key, JSON.stringify(data));
};

var getSessionData = function(key) {
  this.log.debug('getSessionData for key:', key);
  return client.getAsync(key).then(function(results) {
    return JSON.parse(results);
  });
};
