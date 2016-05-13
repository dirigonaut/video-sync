var http 			         = require('http')
var socketIO	         = require('socket.io');

var FileHandler        = require('./utils/FileHandler');
var Bundler 		       = require('./utils/Bundler');
var Validator		       = require('./utils/Validator');
var Authenticator      = require('./authentication/Authenticator');

var VideoController    = require('./video/VideoController');
var StateController    = require('./state/StateController');
var SmtpController     = require('./smtp/SmtpController');
var DatabaseController = require('./database/DatabaseController');

var app   = null;
var io    = null;
var admin = null;

var validator;
var authenticator;

function Server(callback) {
  if(app == null){
    new Bundler();

    fileHandler     = new FileHandler();
    app             = new http.createServer(fileHandler.handler());
    io              = new socketIO(app);

    validator		    = new Validator();
    authenticator   = new Authenticator();
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

        new VideoController(io, socket);
        new StateController(io, socket);
        new SmtpController(io, socket);
        new DatabaseController(io, socket);
      } else {
        socket.auth = false;
      }
    };
    socket.auth = true;

    new VideoController(io, socket);
    new StateController(io, socket);
    new SmtpController(io, socket);
    new DatabaseController(io, socket);

    socket.on('auth-user', function (data) {
      console.log('auth-user');
      authorizor.authorizeUser(socket, validator.sterilizeUser(data));
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
