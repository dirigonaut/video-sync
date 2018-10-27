const Promise = require('bluebird');
const Redis   = require('redis');
const Crypto  = require('crypto');
const Events  = require('events');

Promise.promisifyAll(Redis.RedisClient.prototype);

var client, redisSocket, schemaFactory, eventKeys, config, emitter, log;

function CredentialManager() { }

CredentialManager.prototype.initialize = function(force) {
  if(typeof CredentialManager.prototype.protoInit === 'undefined') {
    CredentialManager.prototype.protoInit = true;
    Object.setPrototypeOf(CredentialManager.prototype, Events.prototype);
    config          = this.factory.createConfig();
    client          = Redis.createClient(config.getConfig().redisInfo.connection);
    subscriber      = Redis.createClient(config.getConfig().redisInfo.connection);
    emitter         = new Events();

    redisSocket     = this.factory.createRedisSocket();
    schemaFactory		= this.factory.createSchemaFactory();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.AUTHENTICATION);

    attachEvents.call(this);
  }

  emitter.on(CredentialManager.Enum.Event.UPDATED, Promise.coroutine(function* () {
    var tokens = yield this.getTokens();
    this.emit(CredentialManager.Enum.Event.UPDATED, tokens);
  }.bind(this)));
};

CredentialManager.prototype.isAdmin = function(socket, password) {
  return socket.handshake.address.includes('127.0.0.1') || config.getConfig().serverInfo.remoteAdminPass === password;
};

CredentialManager.prototype.setAdmin = Promise.coroutine(function* (socket, request) {
  var entry = {
    id: socket.id,
    handle: request.data ? request.data : 'Admin',
    level: CredentialManager.Enum.Level.CONTROLS
  };

  yield setUserData.call(this, CredentialManager.Enum.User.ADMIN, entry);
});

CredentialManager.prototype.getAdmin = Promise.coroutine(function* () {
  var admin = yield getUserData(CredentialManager.Enum.User.ADMIN);
  return admin;
});

CredentialManager.prototype.removeAdmin = Promise.coroutine(function* () {
  yield setUserData.call(this, CredentialManager.Enum.User.ADMIN, null);
});

CredentialManager.prototype.generateTokens = Promise.coroutine(function* (count, level) {
  var entries = yield getUserData(CredentialManager.Enum.User.CLIENT);
  entries = entries ? entries : { };

  for(let i = 0; i < count; ++i) {
    var entry = {
      level: level ? CredentialManager.Enum.Level.CONTROLS : CredentialManager.Enum.Level.NONE,
    };

    var key = undefined;
    for (let i = 0; i < 3; ++i) {
      key = key ? key + '-' : '';
      key += `${parseInt(Crypto.randomBytes(3).toString('hex'), 16)}`.substring(0, 4);
    }

    entries[key] = entry;
  }

  yield setUserData.call(this, CredentialManager.Enum.User.CLIENT, entries);
  return entries;
});

CredentialManager.prototype.deleteTokens = Promise.coroutine(function* (keys) {
  var entries = yield getUserData(CredentialManager.Enum.User.CLIENT);

  for(let i = 0; i < keys.length; ++i) {
    var key = String(keys[i]).trim();
    if(entries && entries[key]) {
      if(entries[key].id) {
        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.LOGRESPONSE,
          [new Date().toLocaleTimeString(), 'notify', 'auth', `${entries[key].handle} has been kicked.`]);

        redisSocket.broadcast.call(CredentialManager.prototype, eventKeys.NOTIFICATION, response);
        redisSocket.disconnect(entries[key].id);
      }

      delete entries[key];
    }
  }

  yield setUserData.call(this, CredentialManager.Enum.User.CLIENT, entries);
  return entries;
});

CredentialManager.prototype.getTokens = Promise.coroutine(function* () {
  var tokens = yield getUserData(CredentialManager.Enum.User.CLIENT);
  return tokens;
});

CredentialManager.prototype.getHandle = Promise.coroutine(function* (socket) {
  var admin = yield this.getAdmin();

  if(admin && socket && admin.id !== socket.id) {
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
        yield setUserData.call(this, CredentialManager.Enum.User.CLIENT, entries);
        return entries;
      }
    }
  }
});

CredentialManager.prototype.setTokenLevel = Promise.coroutine(function* (tokens) {
  var entries = yield this.getTokens(CredentialManager.Enum.User.CLIENT);

  if(entries) {
    for(let i in tokens) {
      entries[tokens[i][0]].level = tokens[i][1] === CredentialManager.Enum.Level.CONTROLS ?
        CredentialManager.Enum.Level.CONTROLS : CredentialManager.Enum.Level.NONE;
    }

    yield setUserData.call(this, CredentialManager.Enum.User.CLIENT, entries);
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
      yield setUserData.call(this, CredentialManager.Enum.User.CLIENT, entries);
      return true;
    }
  }
});

module.exports = CredentialManager;

CredentialManager.Enum = {};
CredentialManager.Enum.User = { ADMIN: 'auth-admin', CLIENT: 'auth-client' };
CredentialManager.Enum.Level = { CONTROLS : 'controls', NONE: 'none' };
CredentialManager.Enum.Event = { UPDATED : 'users-updated' };

var setUserData = function(key, data) {
  log.silly(`setCredentialData for key: ${key}`, data);

  var result = client.setAsync(key, JSON.stringify(data));
  emitter.emit(CredentialManager.Enum.Event.UPDATED);
  client.publishAsync(CredentialManager.Enum.Event.UPDATED, "payload");

  return result;
};

var getUserData = function(key) {
  log.silly('setCredentialData for key:', key);
  return client.getAsync(key).then(function(results) {
    return JSON.parse(results);
  });
};

var attachEvents = function() {
  subscriber.on("message", function(channel, payload) {
    if(channel === CredentialManager.Enum.Event.UPDATED) {
      emitter.emit(CredentialManager.Enum.Event.UPDATED);
    }
  }.bind(this));

  subscriber.on("connect", function(err) {
    log.info("CredentialManager is connected to redis server");
  }.bind(this));

  subscriber.on("error", function(err) {
    log.error(err);
  }.bind(this));

  subscriber.subscribe(CredentialManager.Enum.Event.UPDATED);
};
