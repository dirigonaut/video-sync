const Promise = require('bluebird');

var validator, publisher, session, log;

function DatabaseController() { }

DatabaseController.prototype.initialize = function() {
  if(typeof DatabaseController.prototype.protoInit === 'undefined') {
    DatabaseController.prototype.protoInit = true;

    validator     = this.factory.createValidator();
    publisher     = this.factory.createRedisPublisher();
    session       = this.factory.createSession();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.DATABASE);
  }
};

DatabaseController.prototype.attachSocket = function(io, socket) {
  log.debug("DatabaseController.attachSocket");

  //Create
  socket.on('db-create-smtp', Promise.coroutine(function* (data) {
    log.debug('db-create-smtp');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var cleanData = validator.sterilizeSmtp(data);
      yield publisher.publishAsync(publisher.Enum.DATABASE, ['createSmtp', [cleanData]]);
      socket.emit("db-refresh");
    }
  }));

  socket.on('db-create-session', Promise.coroutine(function* (data) {
    log.debug('db-create-session');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var cleanData = validator.sterilizeSmtp(data);
      yield publisher.publishAsync(publisher.Enum.DATABASE, ['createSession', [cleanData]]);
      socket.emit("db-refresh");
    }
  }));

  //Read
  socket.on('db-read-smpts', Promise.coroutine(function* () {
    log.debug('db-read-smpts');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var smtp = yield publisher.publishAsync(publisher.Enum.DATABASE, ['readAllSmtp', []]);
      if(smtp) {
        socket.emit("db-smtps", smtp);
      }
    }
  }));

  socket.on('db-read-sessions', Promise.coroutine(function* () {
    log.debug('db-read-sessions');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var sessions = yield publisher.publishAsync(publisher.Enum.DATABASE, ['readAllSessions', []]);
      if(sessions) {
        socket.emit("db-sessions", sessions);
      }
    }
  }));

  //Update
  socket.on('db-update-smtp', Promise.coroutine(function* (data) {
    log.debug('db-update-smtp');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var cleanData = validator.sterilizeSmtp(data);
      yield publisher.publishAsync(publisher.Enum.DATABASE, ['updateSmtp', [cleanData[0], cleanData[1]]]);
      socket.emit("db-refresh");
    }
  }));

  socket.on('db-update-session', Promise.coroutine(function* (data) {
    log.debug('db-update-session');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var cleanData = validator.sterilizeSmtp(data);
      yield publisher.publishAsync(publisher.Enum.DATABASE, ['updateSession', [cleanData[0], cleanData[1]]]);
      socket.emit("db-refresh");
    }
  }));

  //Delete
  socket.on('db-delete-smtp', Promise.coroutine(function* (data) {
    log.debug('db-delete-smtp');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var cleanData = validator.sterilizeSmtp(data);
      var deleted = yield publisher.publishAsync(publisher.Enum.DATABASE, ['deleteSmtp', [cleanData]]);
      if(deleted && deleted > 0){
        socket.emit('db-refresh');
      }
    }
  }));

  socket.on('db-delete-session', Promise.coroutine(function* (data) {
    log.debug('db-delete-session');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var cleanData = validator.sterilizeSmtp(data);
      yield publisher.publishAsync(publisher.Enum.DATABASE, ['deleteSession', [cleanData]]);
      if(deleted && deleted > 0){
        socket.emit('db-refresh');
      }
    }
  }));
};

module.exports = DatabaseController;
