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
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.PAIR);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      var tokens = yield credentials.generateTokens(request.id, request.data);
      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.RESPONSE, [tokens]);
      socket.emit(eventKeys.TOKENS, response);
    }
  }.bind(this)));

  socket.on(eventKeys.SETTOKENLEVEL, Promise.coroutine(function*(data) {
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.PAIR);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      var tokens = yield credentials.setTokenLevel(request.id, request.data);
      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.RESPONSE, [tokens]);
      socket.emit(eventKeys.TOKENS, response);
    }
  }.bind(this)));

  socket.on(eventKeys.DELETETOKENS, Promise.coroutine(function*(data) {
    var schema = schemaFactory.createDefinition(schemaFactory.Enums.SCHEMAS.SPECIAL);
    var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

    if(request) {
      var tokens = yield credentials.deleteTokens(request.data.includes(',') ? request.data.split(',') : [request.data]);
      var response = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.RESPONSE, [tokens]);
      socket.emit(eventKeys.TOKENS, response);
    }
  }.bind(this)));
};

module.exports = CredentialController;
