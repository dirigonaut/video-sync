const Promise     = require('bluebird');
const Validator   = require('../authentication/Validator');

var validator, publisher, session, log;

function DatabaseController() { }

DatabaseController.prototype.initialize = function(io, socket) {
  if(typeof DatabaseController.prototype.lazyInit === 'undefined') {
    validator     = this.factory.createValidator();
    publisher     = this.factory.createRedisPublisher();
    session       = this.factory.createSession();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.DATABASE);

    DatabaseController.prototype.lazyInit = true;
  }

  initialize.call(this, io, socket);
};

module.exports = DatabaseController;

function initialize(io, socket) {
  log.debug("Attaching DatabaseController");

  //Create
  socket.on('db-create-smtp', Promise.coroutine(function* (data) {
    log.debug('db-create-smtp');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var emitResults = function() {
        socket.emit("db-refresh");
      }

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['createSmtp', [cleanData]], emitResults);
    }
  }));

  socket.on('db-create-session', Promise.coroutine(function* (data) {
    log.debug('db-create-session');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var emitResults = function() {
        socket.emit("db-refresh");
      }

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['createSession', [cleanData]], emitResults);
    }
  }));

  //Read
  socket.on('db-read-smpts', Promise.coroutine(function* () {
    log.debug('db-read-smpts');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var emitResults = function(smtp) {
        //Remove everything but the address
        socket.emit("db-smtps", smtp);
      }

      publisher.publish(Publisher.Enum.DATABASE, ['readAllSmtp', []], emitResults);
    }
  }));

  socket.on('db-read-sessions', Promise.coroutine(function* () {
    log.debug('db-read-sessions');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var emitResults = function(sessions) {
        socket.emit("db-sessions", sessions);
      };

      publisher.publish(Publisher.Enum.DATABASE, ['readAllSessions', []], emitResults);
    }
  }));

  //Update
  socket.on('db-update-smtp', Promise.coroutine(function* (data) {
    log.debug('db-update-smtp');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var emitResults = function() {
        socket.emit("db-refresh");
      };

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['updateSmtp', [cleanData[0], cleanData[1]]], emitResults);
    }
  }));

  socket.on('db-update-session', Promise.coroutine(function* (data) {
    log.debug('db-update-session');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var emitResults = function(docs) {
        socket.emit("db-refresh");
      };

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['updateSession', [cleanData[0], cleanData[1]]], emitResults);
    }
  }));

  //Delete
  socket.on('db-delete-smtp', Promise.coroutine(function* (data) {
    log.debug('db-delete-smtp');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var emitResults = function(deleted){
        if(deleted > 0){
          socket.emit('db-refresh');
        }
      }

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['deleteSmtp', [cleanData]], emitResults);
    }
  }));

  socket.on('db-delete-session', Promise.coroutine(function* (data) {
    log.debug('db-delete-session');
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      var emitResults = function(deleted){
        if(deleted > 0){
          socket.emit('db-refresh');
        }
      }

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['deleteSession', [cleanData]], emitResults);
    }
  }));
}
