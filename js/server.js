var app 			= require('http').createServer(handler);
var io 				= require('socket.io')(app);
var fs 				= require('fs');

var r_engine 		= require('./state_engine/rules_engine');
var p_manager 		= require('./state_engine/player_manager');
var s_service		= require('./smtp_service/smtp_service');
var database		= require('./nedb/database_utils');
var validate		= require('./input_validator');

var rules_engine 	= new r_engine();
var player_manager	= new p_manager();
var smtp_service	= new s_service();
var db_util 		= new database();
var val_util		= new validate();

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

io.on('connection', function (socket) {
	console.log("socket has connected: " + socket.id);
	player_manager.create_player(socket);
	
	socket.on('state', function (data) {
		console.log("raw: ", data, "clean: ", val_util.check_state(data));
		rules_engine.process_rules(val_util.check_state(data), socket, player_manager);
	});
	
	socket.on('admin', function (data) {
		console.log('admin');
		console.log(data);
	});
	
	socket.on('db-add-contact', function (data) {
		console.log('db-add-contact');
		console.log("raw: ", data, "clean: ", val_util.check_contact(data));
		db_util.add_entry(val_util.check_contact(data));
	});
	
	socket.on('db-add-smtp', function (data) {
		console.log('db-add-smtp');
		console.log("raw: ", data, "clean: ", val_util.check_smtp(data));
		db_util.add_entry(val_util.check_smtp(data));
	});
	
	socket.on('db-smpt-get', function (data) {
		console.log('db-smpt-get');
		db_util.get_all_smtp(socket);		
	});
	
	socket.on('db-smpt-primary', function (data) {
		console.log('db-smpt-primary');
		console.log(data);
		db_util.change_priority(data);
	});
	
	socket.on('db-get-contacts', function (data) {
		console.log('db-get-contacts');
		db_util.get_all_contacts();
	});
	
	socket.on('db-delete-contact', function (data) {
		console.log('db-delete-contact');
		console.log("raw: ", data, "clean: ", val_util.check_contact(data));
		db_util.delete_contact(val_util.check_contact(data));
	});
  
	socket.on('send-email', function (data) {
		console.log('send-email');
		console.log("raw: ", data, "clean: ", val_util.check_email(data));
		smtp_service.set_message(val_util.check_email(data));
		smtp_service.initialize();
	});
});
