var Session     = require('../administration/Session');
var Validator   = require('../authentication/Validator');
var Publisher   = require('../process/redis/RedisPublisher');
var LogManager  = require('../log/LogManager');

var session   = new Session();
var validator = new Validator();
var publisher = new Publisher();

function DatabaseController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  console.log("Attaching DatabaseController");

  //Create
  socket.on('db-create-smtp', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-create-smtp');

      var emitResults = function() {
        socket.emit("db-refresh");
      }

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['createSmtp', [cleanData]], emitResults);
    }
  });

  socket.on('db-create-contact', function(data) {
    if(session.isAdmin(socket.id)) {
  		console.log('db-add-contact');

      var emitResults = function() {
        socket.emit("db-refresh");
      }

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['createContact', [cleanData]], emitResults);
    }
  });

  socket.on('db-create-session', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-create-session');

      var emitResults = function() {
        socket.emit("db-refresh");
      }

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['createSession', [cleanData]], emitResults);
    }
  });

  //Read
  socket.on('db-read-smpts', function() {
    if(session.isAdmin(socket.id)) {
  		console.log('db-read-smtps');

      var emitResults = function(smtp) {
        //Remove everything but the address
        socket.emit("db-smtps", smtp);
      }

      publisher.publish(Publisher.Enum.DATABASE, ['readAllSmtp', []], emitResults);
    }
  });

  socket.on('db-read-contacts', function() {
    if(session.isAdmin(socket.id)) {
      console.log('db-read-contacts');

      var emitResults = function(contacts) {
        socket.emit("db-contacts", contacts);
      };

      publisher.publish(Publisher.Enum.DATABASE, ['readAllContacts', []], emitResults);
    }
  });

  socket.on('db-read-sessions', function() {
    if(session.isAdmin(socket.id)) {
      console.log('db-read-sessions');

      var emitResults = function(sessions) {
        socket.emit("db-sessions", sessions);
      };

      publisher.publish(Publisher.Enum.DATABASE, ['readAllSessions', []], emitResults);
    }
  });

  //Update
  socket.on('db-update-contact', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-update-contact');

      var emitResults = function() {
        socket.emit("db-refresh");
      };

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['updateContact', [cleanData], emitResults);
    }
  });

  socket.on('db-update-smtp', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-update-smtp');

      var emitResults = function() {
        socket.emit("db-refresh");
      };

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['updateSmtp', [cleanData], emitResults);
    }
  });

  socket.on('db-update-session', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-update-session');

      var emitResults = function() {
        socket.emit("db-refresh");
      };

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['updateSession', [cleanData], emitResults);
    }
  });

  //Delete
  socket.on('db-delete-smtp', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-delete-smtp');

      var emitResults = function(deleted){
        if(deleted > 0){
          socket.emit('db-refresh');
        }
      }

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['deleteSmtp', [cleanData], emitResults);
    }
  });

  socket.on('db-delete-contact', function(data) {
    if(session.isAdmin(socket.id)) {
  		console.log('db-delete-contact');

      var emitResults = function(deleted){
        if(deleted > 0){
          socket.emit('db-refresh');
        }
      }

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['deleteContact', [cleanData], emitResults);
    }
  });

  socket.on('db-delete-session', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-delete-session');

      var emitResults = function(deleted){
        if(deleted > 0){
          socket.emit('db-refresh');
        }
      }

      var cleanData = validator.sterilizeSmtp(data);
      publisher.publish(Publisher.Enum.DATABASE, ['deleteSession', [cleanData], emitResults);
    }
  });
}

module.exports = DatabaseController;
