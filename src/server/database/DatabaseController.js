var NeDatabase = require('./utils/database/NeDatabase');

var database = new NeDatabase();

function DatabaseController(io, socket, val_util) {
  initialize(socket, val_util);
}

function initialize(socket) {
  //Database Events
  socket.on('db-add-contact', function (data) {
    if(socket.auth){
  		console.log('db-add-contact');
  		database.add_entry(socket, val_util.check_contact(data));
    }
  });

  socket.on('db-add-smtp', function (data) {
    if(socket.auth){
      console.log('db-add-smtp');
      database.add_entry(socket, val_util.check_smtp(data));
    }
  });

  socket.on('db-get-smpt', function (data) {
    if(socket.auth){
  		console.log('db-get-smtp');
  		database.get_all_smtp(socket, val_util.check_smtp(data));
    }
  });

  socket.on('db-get-contacts', function (data) {
    if(socket.auth){
  		console.log('db-get-contacts');
  		database.get_all_contacts(socket, null);
    }
  });

  socket.on('db-delete-contact', function (data) {
    if(socket.auth){
  		console.log('db-delete-contact');
  		database.delete_contact(socket, val_util.check_contact(data));
    }
  });

  socket.on('db-delete-invites', function (data) {
    if(socket.auth){
      console.log('db-delete-invites');
      database.delete_invitees(socket, null);
    }
  });
}

module.exports = DatabaseController;
