var app 			      = require('http').createServer(handler);
var io 				      = require('socket.io')(app);
var ss                                = require('socket.io-stream');
var fs 				      = require('fs');
var path                              = require('path');
var static                            = require('node-static');

var r_engine 		    = require('./state_engine/rules_engine');
var p_manager 	    = require('./state_engine/player_manager');
var s_service		    = require('./smtp_service/smtp_service');
var database		    = require('./nedb/database_utils');
var validate		    = require('./utils/input_validator');
var authenticate    = require('./authentication/authenticate');
var video_encoder   = require('./utils/video_converter');

var rules_engine 	  = new r_engine();
var player_manager	= new p_manager();
var smtp_service	  = new s_service();
var db_util 		    = new database();
var val_util		    = new validate();
var auth_util       = new authenticate();
var video_util      = new video_encoder();

var admin = null;

app.listen(8080);

var fileServer = new static.Server('',{
    cache: 3600,
    gzip: true
} );

function handler (req, res) {
  console.log("req: " + req);
  req.addListener('end', function() {
    fileServer.serve( req, res );
  }).resume();
}

function build_request(socket, data){
  return {"socket" : socket, "data" : data};
}

io.on('connection', function (socket) {
  console.log("socket has connected: " + socket.id);
  if(!socket.auth){
    if(socket.handshake.address == "127.0.0.1" && admin == null){
      socket.auth = true;
      admin = socket;
    } else {
      socket.auth = false;
    }
  }

  //Video Events
  ss(socket).on('video-stream', function(stream) {
    console.log('video-stream');
    var path = "/home/slacker/Downloads/video.mp4"
    fs.createReadStream(path).pipe(stream);
  });

  //Auth Events
  socket.on('auth-token', function (data) {
    console.log('auth-token');
    if(player_manager.get_player(socket.id) == null){
      auth_util.send_user_tolken(build_request(socket, val_util.check_user(data)));
    }
  });

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

  setTimeout(function(){
    //If the socket didn't authenticate, disconnect it
    if (!socket.auth) {
      console.log("Disconnecting socket ", socket.id);
      socket.disconnect('unauthorized');
      //TODO add db call to remove any tokens in the db for socket
    }
  }, 300000);
});
