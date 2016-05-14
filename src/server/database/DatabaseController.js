var NeDatabase  = require('./NeDatabase');
var Session     = require('../utils/Session');
var Validator   = require('../utils/Validator');

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
      database.createSmtp(validator.sterilizeSmtp(data));
    }
  });

  socket.on('db-create-contact', function(data) {
    if(session.isAdmin(socket.id)) {
  		console.log('db-add-contact');
  		database.createContact(validator.sterilizeContact(data));
    }
  });

  socket.on('db-create-session', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-create-session');
      database.createSession(validator.sterilizeSession(data));
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
    if(socket.auth){
      console.log('db-read-contacts');

      var emitResults = function(contacts) {
        //Remove everything but the address
        socket.emit("db-contacts", contacts);
      };

      database.readAllContacts(emitResults);
    }
  });

  socket.on('db-read-sessions', function() {
    if(socket.auth){
      console.log('db-read-sessions');

      var emitResults = function(contacts) {
        //Remove everything but the address
        socket.emit("db-sessions", contacts);
      };

      database.readAllSessions(emitResults);
    }
  });

  //Update
  socket.on('db-update-contact', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-update-contact');
      database.updateContact(validator.sterilizeContact(data));
    }
  });

  socket.on('db-update-smtp', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-update-smtp');
      database.createSmtp(validator.sterilizeSmtp(data));
    }
  });

  socket.on('db-update-session', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-update-session');
      database.createSession(validator.sterilizeSession(data));
    }
  });

  //Delete
  socket.on('db-delete-smtp', function(data) {
    if(socket.auth){
      console.log('db-delete-smtp');
      database.deleteSmtp(socket, validator.sterilizeContact(data));
    }
  });

  socket.on('db-delete-contact', function(data) {
    if(socket.auth){
  		console.log('db-delete-contact');
  		database.deleteContact(socket, validator.sterilizeEmail(data));
    }
  });

  socket.on('db-delete-session', function(data) {
    if(session.isAdmin(socket.id)) {
      console.log('db-delete-session');
      database.deleteSession(validator.sterilizeSession(data));
    }
  });
}

module.exports = DatabaseController;
