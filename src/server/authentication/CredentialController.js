const Promise = require('bluebird');

var publisher, redisSocket, schemaFactory, sanitizer, credentialManager,
      media, playerManager, eventKeys, log;

function CredentialController() { }

CredentialController.prototype.initialize = function(force) {
  if(typeof CredentialController.prototype.protoInit === 'undefined') {
    CredentialController.prototype.protoInit = true;
    credentials     = this.factory.createCredentialManager();

    schemaFactory		= this.factory.createSchemaFactory();
    sanitizer		    = this.factory.createSanitizer();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.AUTHENTICATION);
  }
};

CredentialController.prototype.attachSocket = function(socket) {
  log.info('CredentialController.attachSocket');

  socket.on(eventKeys.CREATETOKENS, Promise.coroutine(function*(data) {
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.NUMBER);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      socket.emit(eventKeys.TOKENS, credentials.generateTokens(request.data));
    }
  }.bind(this)));

  socket.on(eventKeys.SETTOKENLEVEL, Promise.coroutine(function*(data) {
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.PAIR);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      socket.emit(eventKeys.TOKENS, credentialManager.setTokenLevel(request.id, request.data));
    }
  }.bind(this)));

  socket.on(eventKeys.DELETETOKEN, Promise.coroutine(function*(data) {
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.PAIR);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      var socketIds = credentials.deleteToken(request.id, request.data));
    }
  }.bind(this)));
};

module.exports = AuthenticationController;
