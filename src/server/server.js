var http 			      = require('http')
var socket_io	      = require('socket.io');
var path            = require('path');
var static          = require('node-static');

var Bundler 		       = require('./utils/Bundler');
var Validator		       = require('./utils/Validator');
var Authenticate       = require('./utils/authentication/Authenticate');

var VideoController    = require('./video/VideoController');
var StateController    = require('./state/StateController');
var DatabaseController = require('./utils/database/DatabaseController');

var app = null;
var io;

var val_util;
var auth_util;

var admin = null;

function handler (req, res) {
  console.log(req);
  req.addListener('end', function() {
    file_server.serve( req, res );
  }).resume();
}

function Server(callback) {
  if(app == null){
    file_server = new static.Server('',{
        cache: 0,
        gzip: true
    });

    new Bundler();

    app             = new http.createServer(handler);
    io              = new socket_io(app);



    val_util		    = new validate();
    auth_util       = new authenticate();
    admin           = null;

    app.listen(8080);
    initialize();
    callback();
  }
};

module.exports = Server;

function initialize () {
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
    socket.auth = true;

    new VideoController(socket, val_util);
    new StateController(io, socket, val_util);
    new DatabaseController(io, socket, val_util);
    socket.emit('connected');

    socket.on('auth-user', function (data) {
      console.log('auth-user');
      auth_util.auth_user(socket, val_util.check_user(dat)));
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
