var app 			      = require('http').createServer(handler);
var io 				      = require('socket.io')(app);
var fs 				      = require('fs');

var r_engine 		    = require('./state_engine/rules_engine');
var p_manager 	    = require('./state_engine/player_manager');
var s_service		    = require('./smtp_service/smtp_service');
var database		    = require('./nedb/database_utils');
var validate		    = require('./input_validator');

var rules_engine 	  = new r_engine();
var player_manager	= new p_manager();
var smtp_service	  = new s_service();
var db_util 		    = new database();
var val_util		    = new validate();

app.listen(8080);

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

function build_request(socket, data){
  return {"socket" : socket, "data" : data};
}

io.on('connection', function (socket) {
	console.log("socket has connected: " + socket.id);
	player_manager.create_player(socket);

  //State Events
	socket.on('state', function (data) {
    console.log('state');
		rules_engine.process_rules(build_request(socket, val_util.check_state(data)), player_manager);
	});

  //Database Events
	socket.on('db-add-contact', function (data) {
		console.log('db-add-contact');
		db_util.add_entry(build_request(socket, val_util.check_contact(data)));
	});

	socket.on('db-add-smtp', function (data) {
    console.log('db-add-smtp');
    db_util.add_entry(build_request(socket, val_util.check_smtp(data)));
	});

	socket.on('db-smpt-get', function (data) {
		console.log('db-smpt-get');
		db_util.get_all_smtp(build_request(socket, val_util.check_smtp(data)));
	});

	socket.on('db-get-contacts', function (data) {
		console.log('db-get-contacts');
		db_util.get_all_contacts(build_request(socket, null));
	});

	socket.on('db-delete-contact', function (data) {
		console.log('db-delete-contact');
		db_util.delete_contact(build_request(socket, val_util.check_contact(data)));
	});

  //Smtp Events
  socket.on('init-smtp-creds', function (data) {
    console.log('init-smtp-creds');
    smtp_service.initialize(build_request(socket, val_util.check_smtp(data)));
  });

	socket.on('send-invite', function (data) {
		console.log('send-invite');
		smtp_service.build_and_send_invitations(build_request(socket, val_util.check_email(data)));
	});

  //Auth Events
  socket.on('auth-token', function (data) {
  });

  socket.on('auth-user', function (data) {
  });

  //Admin Events
  socket.on('admin', function (data) {
    console.log('admin');
    console.log(data);
  });
});
