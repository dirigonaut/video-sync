const Promise = require('bluebird');

var publisher, session, database, schemaFactory, sanitizer, eventKeys, log;

function DatabaseController() { }

DatabaseController.prototype.initialize = function(force) {
  if(typeof DatabaseController.prototype.protoInit === 'undefined') {
    DatabaseController.prototype.protoInit = true;
    schemaFactory   = this.factory.createSchemaFactory();
    sanitizer       = this.factory.createSanitizer();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.DATABASE);
  }

  if(force === undefined ? typeof DatabaseController.prototype.stateInit === 'undefined' : force) {
    DatabaseController.prototype.stateInit = true;
    publisher       = this.factory.createRedisPublisher();
    session         = this.factory.createSession();
    database        = this.factory.createNeDatabase(false);
  }
};

DatabaseController.prototype.attachSocket = function(socket) {
  log.debug("DatabaseController.attachSocket");

  //Create
  socket.on(eventKeys.CREATESMTP, Promise.coroutine(function* (data) {
    log.debug(eventKeys.CREATESMTP);
    var isAdmin = yield session.isAdmin(socket.id);

    if(isAdmin) {
      var schema = schemaFactory.createDefinition(schemaFactory.Enum.SMTP);
      var request = sanitizer.sanitize(data, schema, [schema.Enum.SMTPTYPE, schema.Enum.SMTPHOST, schema.Enum.SMTPADDRESS, schema.Enum.SMTPPASSWORD], socket);

      if(request) {
        delete request._id;
        yield publisher.publishAsync(publisher.Enum.DATABASE, [database.functions.CREATESMTP, [request]]);
        socket.emit(eventKeys.DBREFRESH);
      }
    }
  }));

  socket.on(eventKeys.CREATESESSION, Promise.coroutine(function* (data) {
    log.debug(eventKeys.CREATESESSION);
    var isAdmin = yield session.isAdmin(socket.id);

    if(isAdmin) {
      var schema = schemaFactory.createDefinition(schemaFactory.Enum.SESSION);
      var request = sanitizer.sanitize(data, schema, [schema.Enum.TITLE, schema.Enum.SMTP, schema.Enum.INVITEES, schema.Enum.MAILOPTIONS], socket);

      if(request) {
        delete request._id;
        yield publisher.publishAsync(publisher.Enum.DATABASE, [database.functions.CREATESESSION, [request]]);
        socket.emit(eventKeys.DBREFRESH);
      }
    }
  }));

  //Read
  socket.on(eventKeys.READSMTP, Promise.coroutine(function* () {
    log.debug(eventKeys.READSMTP);
    var isAdmin = yield session.isAdmin(socket.id);

    if(isAdmin) {
      var smtp = yield publisher.publishAsync(publisher.Enum.DATABASE, [database.functions.READALLSMTP, []]);

      if(smtp) {
        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.RESPONSE, [smtp]);
        socket.emit(eventKeys.SMTP, response);
      }
    }
  }));

  socket.on(eventKeys.READSESSIONS, Promise.coroutine(function* () {
    log.debug(eventKeys.READSESSIONS);
    var isAdmin = yield session.isAdmin(socket.id);

    if(isAdmin) {
      var sessions = yield publisher.publishAsync(publisher.Enum.DATABASE, [database.functions.READALLSESSIONS, []]);
      if(sessions) {
        var response = schemaFactory.createPopulatedSchema(schemaFactory.Enum.RESPONSE, [sessions]);
        socket.emit(eventKeys.SESSION, response);
      }
    }
  }));

  //Update
  socket.on(eventKeys.UPDATESMTP, Promise.coroutine(function* (data) {
    log.debug(eventKeys.UPDATESMTP);
    var isAdmin = yield session.isAdmin(socket.id);

    if(isAdmin) {
      var schema = schemaFactory.createDefinition(schemaFactory.Enum.SMTP);
      var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

      if(request) {
        yield publisher.publishAsync(publisher.Enum.DATABASE, [database.functions.UPDATESMTP, [request]]);
        socket.emit(eventKeys.DBREFRESH);
      }
    }
  }));

  socket.on(eventKeys.UPDATESESSION, Promise.coroutine(function* (data) {
    log.debug(eventKeys.UPDATESESSION);
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var schema = schemaFactory.createDefinition(schemaFactory.Enum.SESSION);
      var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

      if(request) {
        yield publisher.publishAsync(publisher.Enum.DATABASE, [database.functions.UPDATESESSION, [request]]);
        socket.emit(eventKeys.DBREFRESH);
      }
    }
  }));

  //Delete
  socket.on(eventKeys.DELETESMTP, Promise.coroutine(function* (data) {
    log.debug(eventKeys.DELETESMTP);
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var schema = schemaFactory.createDefinition(schemaFactory.Enum.STRING);
      var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

      if(request) {
        var deleted = yield publisher.publishAsync(publisher.Enum.DATABASE, [database.functions.DELETESMTP, [request.data]]);
        if(deleted && deleted > 0){
          socket.emit(eventKeys.DBREFRESH);
        }
      }
    }
  }));

  socket.on(eventKeys.DELETESESSION, Promise.coroutine(function* (data) {
    log.debug(eventKeys.DELETESESSION);
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var schema = schemaFactory.createDefinition(schemaFactory.Enum.STRING);
      var request = sanitizer.sanitize(data, schema, Object.values(schema.Enum), socket);

      if(request) {
        var deleted = yield publisher.publishAsync(publisher.Enum.DATABASE, [database.functions.DELETESESSION, [request.data]]);
        if(deleted && deleted > 0){
          socket.emit(eventKeys.DBREFRESH);
        }
      }
    }
  }));
};

module.exports = DatabaseController;
