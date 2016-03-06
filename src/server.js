var http 			      = require('http')
var socket_io	      = require('socket.io');
var path            = require('path');
var static          = require('node-static');

var r_engine 		    = require('../../src/server/state/state_engine/rules_engine');
var p_manager 	    = require('../../src/server/state/player/player_manager');
var s_service		    = require('../../src/server/utils/smtp_service/smtp_service');
var database		    = require('../../src/server/utils/database/database_utils');
var validate		    = require('../../src/server/utils/input_validator');
var authenticate    = require('../../src/server/utils/authentication/authenticate');
var VideoController = require('../../src/server/video/VideoController');

var app = null;
var io;

var rules_engine;
var player_manager;
var smtp_service;
var db_util;
var val_util;
var auth_util;

var admin = null;

function handler (req, res) {
  console.log("req: " + req);
  req.addListener('end', function() {
    file_server.serve( req, res );
  }).resume();
}

function build_request(socket, data){
  return {"socket" : socket, "data" : data};
}

function server_start () {
  if(app == null){
    file_server = new static.Server('',{
        cache: 0,
        gzip: true
    });

    app             = new http.createServer(handler);
    io              = new socket_io(app);

    rules_engine 	  = new r_engine();
    player_manager	= new p_manager();
    smtp_service	  = new s_service();
    db_util 		    = new database();
    val_util		    = new validate();
    auth_util       = new authenticate();
    admin           = null;

    app.listen(8080);

    socket_setup();

    return true;
  }

  return false;
};

function socket_setup () {
  io.on('connection', function (socket) {
    console.log("socket has connected: " + socket.id + " ip:" + socket.handshake.address);
    if(!socket.auth){
      if(socket.handshake.address == "::ffff:127.0.0.1" && admin == null){
        socket.auth = true;
        admin = socket;
      } else {
        socket.auth = false;
      }
    };

    new VideoController(socket, build_request, val_util);

    socket.on('auth-user', function (data) {
      console.log('auth-user');
      auth_util.auth_user(build_request(socket, val_util.check_user(data)));
    });

    //State Events
  	socket.on('state', function (data) {
      if(socket.auth){
        console.log('state');
    		rules_engine.process_rules(build_request(socket, val_util.check_state(data)), player_manager);
      }
  	});

    //Database Events
  	socket.on('db-add-contact', function (data) {
      if(socket.auth){
    		console.log('db-add-contact');
    		db_util.add_entry(build_request(socket, val_util.check_contact(data)));
      }
  	});

  	socket.on('db-add-smtp', function (data) {
      if(socket.auth){
        console.log('db-add-smtp');
        db_util.add_entry(build_request(socket, val_util.check_smtp(data)));
      }
  	});

  	socket.on('db-get-smpt', function (data) {
      if(socket.auth){
    		console.log('db-get-smtp');
    		db_util.get_all_smtp(build_request(socket, val_util.check_smtp(data)));
      }
  	});

  	socket.on('db-get-contacts', function (data) {
      if(socket.auth){
    		console.log('db-get-contacts');
    		db_util.get_all_contacts(build_request(socket, null));
      }
  	});

  	socket.on('db-delete-contact', function (data) {
      if(socket.auth){
    		console.log('db-delete-contact');
    		db_util.delete_contact(build_request(socket, val_util.check_contact(data)));
      }
  	});

    socket.on('db-delete-invites', function (data) {
      if(socket.auth){
        console.log('db-delete-invites');
        db_util.delete_invitees(build_request(socket, null));
      }
    });

    //Smtp Events
    socket.on('smtp-init', function (data) {
      if(socket.auth){
        console.log('smtp-init-creds');
        smtp_service.initialize(build_request(socket, val_util.check_smtp(data)));
      }
    });

  	socket.on('smtp-invite', function (data) {
      if(socket.auth){
    		console.log('smtp-invite');
    		smtp_service.build_and_send_invitations(build_request(socket, val_util.check_email(data)));
      }
  	});

    //Admin Events
    socket.on('admin', function (data) {
      if(socket.auth){
        console.log('admin');
        console.log(data);
      }
    });

    socket.on('error', function (data) {
      console.log(data);
    });

    setTimeout(function(){
      //If the socket didn't authenticate, disconnect it
      if (!socket.auth) {
        console.log("Disconnecting socket ", socket.id);
        socket.disconnect('unauthorized');
        //TODO add db call to remove any tokens in the db for socket
      }
    }, 300000);
  });
}
