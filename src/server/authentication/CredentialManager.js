const Promise = require('bluebird');
const Redis   = require('redis');
const Crypto  = require('crypto');

Promise.promisifyAll(Redis.RedisClient.prototype);

var log;

function CredentialManager() { }

CredentialManager.prototype.initialize = function(force) {
  if(typeof CredentialManager.prototype.protoInit === 'undefined') {
    CredentialManager.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.AUTHENTICATION);
  }
};

CredentialManager.prototype.isAdmin = Promise.coroutine(function* (socket) {
  var isLocalHost = socket.handshake.address.includes('127.0.0.1');

  if(isLocalHost) {
    yield setUserData(CredentialManager.Enum.User.ADMIN, socket.id);
  }

  return isLocalHost;
});

CredentialManager.prototype.getAdmin = Promise.coroutine(function* () {
  return getUserData(CredentialManager.Enum.User.ADMIN);
});

CredentialManager.prototype.removeAdmin = Promise.coroutine(function* (socket) {
  if(socket.handshake.address.includes('127.0.0.1')) {
    yield setUserData(CredentialManager.Enum.User.ADMIN, null);
  }
});

CredentialManager.prototype.generateTokens = Promise.coroutine(function* (count) {
  var entries = yield getUserData(CredentialManager.Enum.User.CLIENT);
  entries = entries ? entries : { };

  for(var i = 0; i < count; ++i) {
    entries.set(Crypto.randomBytes(24).toString('hex'), null);
  }

  yield setUserData(CredentialManager.Enum.User.CLIENT, entries);
  return entries;
});

CredentialManager.prototype.deleteToken = Promise.coroutine(function* (key) {
  var entries = yield getUserData(CredentialManager.Enum.User.CLIENT);
  var removedIds = [];

  for(var i = 0; i < keys.length; ++i) {
    removedIds.push(entries.keys[i].socket);
    entries.delete(keys[i]);
  }

  yield setUserData(CredentialManager.Enum.User.CLIENT, entries);
  return removedIds;
});

CredentialManager.prototype.getTokens = Promise.coroutine(function* () {
  return yield getUserData(CredentialManager.Enum.User.CLIENT);
});

CredentialManager.prototype.resetToken = Promise.coroutine(function* (socketId) {
  var entries = yield getUserData(CredentialManager.Enum.User.CLIENT);

  if(entries) {
    for(var i = 0; i < entries.length; ++i) {
      var entry = entries.get(key);

      if(entry && entry.socket === socketId) {
        delete entry.socket;
        delete entry.secret;
        entries.set(keys[i], entry);
        break;
      }
    }

    yield setUserData(CredentialManager.Enum.User.CLIENT, entries);
  }

  return entries;
});

CredentialManager.prototype.setTokenLevel = Promise.coroutine(function* (key, level) {
  var entries = yield getUserData(CredentialManager.Enum.User.CLIENT);
  var entry = entries.get(key);

  if(entry) {
    entry.level = level ? CredentialManager.Level.CONTROLS : undefined;
    entries.set(key, entry);

    yield setUserData(CredentialManager.Enum.User.CLIENT, entries);
  }

  return entries;
});

CredentialManager.prototype.getTokenLevel = Promise.coroutine(function* (key, level) {
  var entries = yield getUserData(CredentialManager.Enum.User.CLIENT);
  return entries.get(key).level;
});

CredentialManager.prototype.authenticateToken = Promise.coroutine(function* (key, socketId, secret) {
  var entries = yield getUserData(CredentialManager.Enum.User.CLIENT);
  var entry = entries.get(key);

  if(entry && entry.socket === "undefined") {
    var invitee = { };
    invitee.socket = socketId;
    invitee.secret = secret;
    invitee.level = CredentialManager.Enum.Level.CONTROLS;

    entries.set(key, invitee);
    yield setUserData(CredentialManager.Enum.User.CLIENT, entries);

    return true;
  }

  return false;
});

module.exports = CredentialManager;

CredentialManager.Enum = {};
CredentialManager.Enum.User = { ADMIN: 'auth-admin', CLIENT: 'auth-client' };
CredentialManager.Enum.Level = { CONTROLS : 'controls', NONE: 'none' };

var setUserData = function(key, data) {
  log.silly('setCredentialData for key: ', key);
  return client.setAsync(key, JSON.stringify(data));
};

var getUserData = function(key) {
  log.silly('setCredentialData for key:', key);
  return client.getAsync(key).then(function(results) {
    return JSON.parse(results);
  });
};
