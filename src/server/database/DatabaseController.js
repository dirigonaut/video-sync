var Session     = require('../administration/Session');
var Validator   = require('../authentication/Validator');
var Publisher   = require('../process/redis/RedisPublisher');
var LogManager  = require('../log/LogManager');

var log       = LogManager.getLog(LogManager.LogEnum.DATABASE);
var session   = new Session();
var validator = new Validator();
var publisher = new Publisher();

function DatabaseController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  log.debug("Attaching DatabaseController");

  //Create
  socket.on('db-create-smtp', function(data) {
    log.debug('db-create-smtp');
    var ifAdmin = function(isAdmin) {
      if(isAdmin) {
        var emitResults = function() {
          socket.emit("db-refresh");
        }

        var cleanData = validator.sterilizeSmtp(data);
        publisher.publish(Publisher.Enum.DATABASE, ['createSmtp', [cleanData]], emitResults);
      }
    }

    session.isAdmin(socket.id, ifAdmin);
  });

  socket.on('db-create-session', function(data) {
    log.debug('db-create-session');
    var ifAdmin = function(isAdmin) {
      if(isAdmin) {
        var emitResults = function() {
          socket.emit("db-refresh");
        }

        var cleanData = validator.sterilizeSmtp(data);
        publisher.publish(Publisher.Enum.DATABASE, ['createSession', [cleanData]], emitResults);
      }
    }

    session.isAdmin(socket.id, ifAdmin);
  });

  //Read
  socket.on('db-read-smpts', function() {
    log.debug('db-read-smpts');
    var ifAdmin = function(isAdmin) {
      if(isAdmin) {
        var emitResults = function(smtp) {
          //Remove everything but the address
          socket.emit("db-smtps", smtp);
        }

        publisher.publish(Publisher.Enum.DATABASE, ['readAllSmtp', []], emitResults);
      }
    }

    session.isAdmin(socket.id, ifAdmin);
  });

  socket.on('db-read-sessions', function() {
    log.debug('db-read-sessions');
    var ifAdmin = function(isAdmin) {
      if(isAdmin) {
        var emitResults = function(sessions) {
          socket.emit("db-sessions", sessions);
        };

        publisher.publish(Publisher.Enum.DATABASE, ['readAllSessions', []], emitResults);
      }
    };

    session.isAdmin(socket.id, ifAdmin);
  });

  //Update
  socket.on('db-update-smtp', function(data) {
    log.debug('db-update-smtp');
    var ifAdmin = function(isAdmin) {
      if(isAdmin) {
        var emitResults = function() {
          socket.emit("db-refresh");
        };

        var cleanData = validator.sterilizeSmtp(data);
        publisher.publish(Publisher.Enum.DATABASE, ['updateSmtp', [cleanData[0], cleanData[1]]], emitResults);
      }
    };

    session.isAdmin(socket.id, ifAdmin);
  });

  socket.on('db-update-session', function(data) {
    log.debug('db-update-session');
    var ifAdmin = function(isAdmin) {
      if(isAdmin) {
        var emitResults = function(docs) {
          socket.emit("db-refresh");
        };

        var cleanData = validator.sterilizeSmtp(data);
        publisher.publish(Publisher.Enum.DATABASE, ['updateSession', [cleanData[0], cleanData[1]]], emitResults);
      }
    };

    session.isAdmin(socket.id, ifAdmin);
  });

  //Delete
  socket.on('db-delete-smtp', function(data) {
    log.debug('db-delete-smtp');
    var ifAdmin = function(isAdmin) {
      if(isAdmin) {
        var emitResults = function(deleted){
          if(deleted > 0){
            socket.emit('db-refresh');
          }
        }

        var cleanData = validator.sterilizeSmtp(data);
        publisher.publish(Publisher.Enum.DATABASE, ['deleteSmtp', [cleanData]], emitResults);
      }
    };

    session.isAdmin(socket.id, ifAdmin);
  });

  socket.on('db-delete-session', function(data) {
    log.debug('db-delete-session');
    var ifAdmin = function(isAdmin) {
      if(isAdmin) {
        var emitResults = function(deleted){
          if(deleted > 0){
            socket.emit('db-refresh');
          }
        }

        var cleanData = validator.sterilizeSmtp(data);
        publisher.publish(Publisher.Enum.DATABASE, ['deleteSession', [cleanData]], emitResults);
      }
    };

    session.isAdmin(socket.id, ifAdmin);
  });
}

module.exports = DatabaseController;
