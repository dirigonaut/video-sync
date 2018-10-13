const Promise = require('bluebird');

var publisher, redisSocket, schemaFactory, sanitizer, credentialManager,
      media, playerManager, eventKeys, log;

function CredentialController() { }

CredentialController.prototype.initialize = function(force) {
  if(typeof CredentialController.prototype.protoInit === 'undefined') {
    CredentialController.prototype.protoInit = true;
    credentials     = this.factory.createCredentialManager();
    redisSocket     = this.factory.createRedisSocket();

    schemaFactory		= this.factory.createSchemaFactory();
    sanitizer		    = this.factory.createSanitizer();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.AUTHENTICATION);

    credentials.on(credentials.Enums.EVENT.UPDATED, function(data) {
      sendUpdatedTokens.call(this, data);
    }.bind(this));
  }
};

CredentialController.prototype.attachSocket = function(socket) {
  log.info('CredentialController.attachSocket');

  socket.on(eventKeys.CREATETOKENS, Promise.coroutine(function*(data) {
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.PAIR);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      yield credentials.generateTokens(request.id, request.data);
    }
  }.bind(this)));

  socket.on(eventKeys.GETTOKENS, Promise.coroutine(function*() {
    var tokens = yield credentials.getTokens();
    sendUpdatedTokens(tokens ? tokens : {});
  }.bind(this)));

  socket.on(eventKeys.SETTOKENLEVEL, Promise.coroutine(function*(data) {
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.SPECIAL);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      yield credentials.setTokenLevel(request.data);
    }
  }.bind(this)));

  socket.on(eventKeys.DELETETOKENS, Promise.coroutine(function*(data) {
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.SPECIAL);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      yield credentials.deleteTokens(request.data);
    }
  }.bind(this)));
};

module.exports = CredentialController;

var sendUpdatedTokens = Promise.coroutine(function* (tokens) {
  var admin = yield credentials.getAdmin();

  if(admin && admin.id) {
    if(tokens) {
      tokens['admin'] = admin;
    }

    var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.RESPONSE, [tokens]);
    redisSocket.ping.call(this, admin.id, eventKeys.TOKENS, response);
  }
});
