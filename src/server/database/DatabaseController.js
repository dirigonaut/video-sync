var NeDatabase  = require('./NeDatabase');
var Session     = require('../administration/Session');
var Validator   = require('../authentication/Validator');
var Log         = require('../utils/Logger')

var database  = new NeDatabase();
var validator = new Validator();
var session   = new Session();

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

      database.createSmtp(validator.sterilizeSmtp(data), emitResults);
    }
  });

  socket.on('db-create-contact', function(data) {
    if(session.isAdmin(socket.id)) {
  		console.log('db-add-contact');

      var emitResults = function() {
        socket.emit("db-refresh");
      }

  		database.createContact(validator.sterilizeContact(data), emitResults);
    }
  });

  socket.on('db-create-session', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-create-session');

      var emitResults = function() {
        socket.emit("db-refresh");
      }

      database.createSession(validator.sterilizeSession(data), emitResults);
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

  		database.readAllSmtp(emitResults);
    }
  });

  socket.on('db-read-contacts', function() {
    if(session.isAdmin(socket.id)) {
      console.log('db-read-contacts');

      var emitResults = function(contacts) {
        socket.emit("db-contacts", contacts);
      };

      database.readAllContacts(emitResults);
    }
  });

  socket.on('db-read-sessions', function() {
    if(session.isAdmin(socket.id)) {
      console.log('db-read-sessions');

      var emitResults = function(sessions) {
        socket.emit("db-sessions", sessions);
      };

      database.readAllSessions(emitResults);
    }
  });

  //Update
  socket.on('db-update-contact', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-update-contact');

      var emitResults = function() {
        socket.emit("db-refresh");
      };

      database.updateContact(data[0], validator.sterilizeContact(data[1]), emitResults);
    }
  });

  socket.on('db-update-smtp', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-update-smtp');

      var emitResults = function() {
        socket.emit("db-refresh");
      };

      console.log(data);
      database.updateSmtp(data[0], validator.sterilizeSmtp(data[1]), emitResults);
    }
  });

  socket.on('db-update-session', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-update-session');

      var emitResults = function() {
        socket.emit("db-refresh");
      };

      database.updateSession(data[0], validator.sterilizeSession(data[1]), emitResults);
    }
  });

  //Delete
  socket.on('db-delete-smtp', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-delete-smtp');

      var emitResponse = function(deleted){
        if(deleted > 0){
          socket.emit('db-refresh');
        }
      }

      database.deleteSmtp(validator.sterilizeSmtp(data), emitResponse);
    }
  });

  socket.on('db-delete-contact', function(data) {
    if(session.isAdmin(socket.id)) {
  		console.log('db-delete-contact');

      var emitResponse = function(deleted){
        if(deleted > 0){
          socket.emit('db-refresh');
        }
      }

  		database.deleteContact(validator.sterilizeEmail(data), emitResponse);
    }
  });

  socket.on('db-delete-session', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-delete-session');

      var emitResponse = function(deleted){
        if(deleted > 0){
          socket.emit('db-refresh');
        }
      }

      database.deleteSession(validator.sterilizeSession(data), emitResponse);
    }
  });
}

module.exports = DatabaseController;
