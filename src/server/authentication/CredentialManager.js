const Promise = require('bluebird');
const Redis   = require('redis');
const Crypto  = require('crypto');

Promise.promisifyAll(Redis.RedisClient.prototype);

var client, redisSocket, schemaFactory, eventKeys, log;

function CredentialManager() { }

CredentialManager.prototype.initialize = function(force) {
  if(typeof CredentialManager.prototype.protoInit === 'undefined') {
    CredentialManager.prototype.protoInit = true;
    var config      = this.factory.createConfig();
    client          = Redis.createClient(config.getConfig().redis);

    redisSocket     = this.factory.createRedisSocket();
    schemaFactory		= this.factory.createSchemaFactory();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.AUTHENTICATION);
  }
};

CredentialManager.prototype.isAdmin = function(socket) {
  return socket.handshake.address.includes('127.0.0.1');
};

CredentialManager.prototype.setAdmin = Promise.coroutine(function* (socket, request) {
  var entry = {
    id: socket.id,
    level: CredentialManager.Enum.Level.CONTROLS
  };

  if(typeof request.data !== 'undefined') {
    entry.handle = request.data;
  }

  yield setUserData(CredentialManager.Enum.User.ADMIN, entry);
});

CredentialManager.prototype.getAdmin = Promise.coroutine(function* () {
  var admin = yield getUserData(CredentialManager.Enum.User.ADMIN);
  return admin;
});

CredentialManager.prototype.removeAdmin = Promise.coroutine(function* (socket) {
  if(socket.handshake.address.includes('127.0.0.1')) {
    yield setUserData(CredentialManager.Enum.User.ADMIN, null);
  }
});

CredentialManager.prototype.generateTokens = Promise.coroutine(function* (count, level) {
  var entries = yield getUserData(CredentialManager.Enum.User.CLIENT);
  entries = entries ? entries : { };

  for(let i = 0; i < count; ++i) {
    var entry = {
      level: level ? CredentialManager.Enum.Level.CONTROLS : CredentialManager.Enum.Level.NONE,
    };

    entries[Crypto.randomBytes(24).toString('hex')] = entry;
  }

  yield setUserData(CredentialManager.Enum.User.CLIENT, entries);
  return entries;
});

CredentialManager.prototype.deleteTokens = Promise.coroutine(function* (keys) {
  var entries = yield getUserData(CredentialManager.Enum.User.CLIENT);

  for(let i = 0; i < keys.length; ++i) {
    var key = String(keys[i]).trim();
    if(entries && entries[key]) {
      if(entries[key].id) {
        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.LOGRESPONSE,
          [new Date().toTimeString(), 'notify', 'auth', `${entries[key].handle} has been kicked.`]);

        redisSocket.broadcast.call(CredentialManager.prototype, eventKeys.NOTIFICATION, response);
        redisSocket.disconnect(entries[key].id);
      }

      delete entries[key];
    }
  }

  yield setUserData(CredentialManager.Enum.User.CLIENT, entries);
  return entries;
});

CredentialManager.prototype.getTokens = Promise.coroutine(function* () {
  var tokens = yield getUserData(CredentialManager.Enum.User.CLIENT);
  return tokens;
});

CredentialManager.prototype.getHandle = Promise.coroutine(function* (socket) {
  var isAdmin = this.isAdmin(socket);

  if(!isAdmin) {
    var id = socket.id;
    var tokens = yield getUserData(CredentialManager.Enum.User.CLIENT);

    for(var key in tokens) {
      if(tokens[key].id === id) {
        return tokens[key].handle;
      }
    }
  } else {
    var token = yield getUserData(CredentialManager.Enum.User.ADMIN);
    return token.handle ? token.handle : 'Admin';
  }
});

CredentialManager.prototype.includes = Promise.coroutine(function* (id) {
  var entries = yield this.getTokens();

  for(var key in entries) {
    if(entries[key].id === id) {
      return true;
    }
  }
});

CredentialManager.prototype.resetToken = Promise.coroutine(function* (socketId) {
  var entries = yield this.getTokens(CredentialManager.Enum.User.CLIENT);

  if(entries) {
    for(let key in entries) {
      if(entries[key] && entries[key].id === socketId) {
        entries[key] = { level: entries[key].level };
        yield setUserData(CredentialManager.Enum.User.CLIENT, entries);
        return entries;
      }
    }
  }
});

CredentialManager.prototype.setTokenLevel = Promise.coroutine(function* (key, level) {
  var entries = yield this.getTokens(CredentialManager.Enum.User.CLIENT);
  var entry = entries ? entries[key] : undefined;

  if(entry) {
    entry.level = level === CredentialManager.Enum.Level.CONTROLS ?
      CredentialManager.Enum.Level.CONTROLS : CredentialManager.Enum.Level.NONE;
    entries[key] = entry;

    yield setUserData(CredentialManager.Enum.User.CLIENT, entries);
  }

  return entries;
});

CredentialManager.prototype.getTokenLevel = Promise.coroutine(function* (key) {
  var admin = yield this.getAdmin();

  if(admin.id === key) {
    return admin.level;
  }

  var entries = yield this.getTokens();
  var user;
  Object.entries(entries).forEach((entry, index) => {
    if(!user && entry[1].id === key) {
      user = entry[1];
    }
  });

  return user !== undefined ? user.level : CredentialManager.Enum.Level.NONE
});

CredentialManager.prototype.authenticateToken = Promise.coroutine(function* (socketId, key, handle) {
  var entries = yield getUserData(CredentialManager.Enum.User.CLIENT);

  if(entries) {
    var entry = entries[key];

    if(entry && !entry.id) {
      var user = { };
      user.id = socketId;
      user.handle = handle;
      user.level = entry.level;

      entries[key] = user;
      yield setUserData(CredentialManager.Enum.User.CLIENT, entries);
      sendUpdatedTokens.call(this, entries);

      return true;
    }
  }
});

module.exports = CredentialManager;

CredentialManager.Enum = {};
CredentialManager.Enum.User = { ADMIN: 'auth-admin', CLIENT: 'auth-client' };
CredentialManager.Enum.Level = { CONTROLS : 'controls', NONE: 'none' };
CredentialManager.Enum.Event = { DELETE : 'delete' };

var setUserData = function(key, data) {
  log.silly(`setCredentialData for key: ${key}`, data);
  return client.setAsync(key, JSON.stringify(data));
};

var getUserData = function(key) {
  log.silly('setCredentialData for key:', key);
  return client.getAsync(key).then(function(results) {
    return JSON.parse(results);
  });
};

var sendUpdatedTokens = Promise.coroutine(function* (tokens) {
  var admin = yield this.getAdmin();
  var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.RESPONSE, [tokens]);

  if(admin && admin.id) {
    redisSocket.ping.call(this, admin.id, eventKeys.TOKENS, response);
  }
});
