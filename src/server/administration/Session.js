const Promise       = require('bluebird');
const Redis         = require('redis');
const Cache         = require('../utils/Cache');
const Config        = require('../utils/Config');
const LogManager    = require('../log/LogManager');
const Publisher     = require('../process/redis/RedisPublisher');

Promise.promisifyAll(Redis.RedisClient.prototype);

var log           = LogManager.getLog(LogManager.LogEnum.ADMINISTRATION);
var config, cache, publisher, client;

function lazyInit() {
  config        = new Config();
  cache         = new Cache();
  publisher 		= new Publisher();
  client        = Redis.createClient(config.getConfig().redis);
}

class Session {
  constructor() {
    if(typeof Session.prototype.lazyInit === 'undefined') {
      lazyInit();
      Session.prototype.lazyInit = true;
    }
  }
}

Session.prototype.setSession = Promise.coroutine(function* (id) {
  log.debug("Session.setActiveSession");

  var setSession = Promise.coroutine(function* (session) {
    var result = yield setSessionData(Session.Enum.ACTIVE, session[0]);

    var invitees = [];
    for(let i = 0; i < session[0].invitees.length; ++i) {
      var invitee = { };
      invitee.id = null;
      invitee.email = session[0].invitees[i];
      invitee.pass = null;
      invitees.push(invitee);
    }

    this.setInvitees(invitees);
  }).bind(this);

  publisher.publish(Publisher.Enum.DATABASE, ['readSession', [id]], setSession);
});

Session.prototype.getSession = function() {
  log.debug("Session.getActiveSession");
  return getSessionData(Session.Enum.ACTIVE);
};

Session.prototype.getInvitees = function() {
  log.debug("Session.getInvitees");
  return getSessionData(Session.Enum.USERS);
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

  var invitees = yield this.getInvitees(handleResult);
  if(typeof invitees !== 'undefined' && invitees) {
    var found = false;
    for(var i in invitees) {
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
    for(var i in invitees) {
      if(invitees[i] === id) {
        invitees.splice(i, 1);
        return this.setInvitees(invitees);
      }
    }
  }

  return new Promise.reject(new Error(`There is no use with the this id: ${id}`));
});

Session.prototype.setMediaStarted = Promise.coroutine(function* (started) {
  log.silly("Session.setMediaStarted");
  var basePath = yield this.getMediaPath(checkMediaPathSet);
  if(typeof basePath !== 'undefined' && basePath) {
    return setSessionData(Session.Enum.STARTED, started);
  }

  return new Promise.reject(new Error("Media is not defined."));
});

Session.prototype.getMediaStarted = function() {
  log.silly("Session.getMediaStarted");
  return getSessionData(Session.Enum.STARTED);
};

Session.prototype.setMediaPath = Promise.coroutine(function* (path) {
  log.info("Session.setMediaPath");
  var results = yield setSessionData(Session.Enum.MEDIA, path, handleResult);
  yield this.setMediaStarted(false);
  cache.setPath(path);
});

Session.prototype.getMediaPath = function() {
  log.debug("Session.getMediaPath");
  return getSessionData(Session.Enum.MEDIA);
};

Session.prototype.isAdmin = Promise.coroutine(function* (id) {
  log.debug("Session.isAdmin");
  var adminList = yield getSessionData(Session.Enum.ADMIN, compareResults);

  if(typeof adminList !== 'undefined' && adminList) {
    for(var i in adminList) {
      if(adminList[i] === id) {
        return true;
      }
    }
  }

  return false;
});

Session.prototype.getAdmin = function (id) {
  return getSessionData(Session.Enum.ADMIN);
};

Session.prototype.addAdmin = Promise.coroutine(function* (id) {
  log.info("Session.setAdmin");
  var adminList = yield this.getAdmin(addEntry);

  if(typeof adminList !== 'undefined' && adminList) {
    if(adminList === undefined || adminList === null) {
        adminList = [];
    }

    adminList.push(id);
    yield setSessionData(Session.Enum.ADMIN, adminList);
  }
});

Session.prototype.removeAdmin = Promise.coroutine(function* (id) {
  log.info("Session.removeAdmin");
  var adminList = yield this.getAdmin(addEntry);

  if(typeof adminList !== 'undefined' && adminList) {
    for(let i = 0; i < adminList.length; ++i) {
      if(adminList[i] === id) {
        adminList.splice(i, 1);
        yield setSessionData(Session.Enum.ADMIN, adminList);
        break;
      }
    }
  }
});

module.exports = Session;

Session.Enum = { ACTIVE: "session-active", MEDIA: "session-media", ADMIN: "session-admin", IP: "session-ip", STARTED: "session-started", USERS: "session-users"};

var setSessionData = function(key, data) {
  log.debug('setSessionData for key: ', key);
  return client.setAsync(key, JSON.stringify(data));
};

var getSessionData = function(key) {
  log.debug('getSessionData for key:', key);
  return client.getAsync(key).then(function(results) {
    return JSON.parse(results);
  });
};
