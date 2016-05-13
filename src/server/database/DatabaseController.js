var NeDatabase = require('./NeDatabase');
var Validator	 = require('../utils/Validator');

var database   = new NeDatabase();
var validator  = new Validator();

function DatabaseController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  console.log("Attaching DatabaseController");

  socket.on('db-add-contact', function (data) {
    if(socket.auth){
  		console.log('db-add-contact');
  		database.addEntry(socket, validator.sterilizeContact(data));
    }
  });

  socket.on('db-add-smtp', function (data) {
    if(socket.auth){
      console.log('db-add-smtp');
      database.addEntry(socket, validator.sterilizeSmtp(data));
    }
  });

  socket.on('db-get-smpt', function (data) {
    if(socket.auth){
  		console.log('db-get-smtp');
  		database.getAllSmtp(socket, validator.sterilizeSmtp(data));
    }
  });

  socket.on('db-get-contacts', function (data) {
    if(socket.auth){
  		console.log('db-get-contacts');
  		database.getAllContacts(socket, null);
    }
  });

  socket.on('db-delete-contact', function (data) {
    if(socket.auth){
  		console.log('db-delete-contact');
  		database.deleteContact(socket, validator.sterilizeContact(data));
    }
  });

  socket.on('db-delete-invites', function (data) {
    if(socket.auth){
      console.log('db-delete-invites');
      database.deleteInvitees(socket, null);
    }
  });
}

module.exports = DatabaseController;
