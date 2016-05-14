var Http        = require('http')
var NodeStatic  = require('node-static');
var SocketIO    = require('socket.io');

var Bundler       = require('./utils/Bundler');
var Validator     = require('./utils/Validator');
var Authenticator = require('./authentication/Authenticator');

var VideoController     = require('./video/VideoController');
var StateController     = require('./state/StateController');
var SmtpController      = require('./smtp/SmtpController');
var DatabaseController  = require('./database/DatabaseController');

var app = null;
var io  = null;
var ns  = null;

var admin = null;

var validator;
var authenticator;

function Server(callback) {
  if(app == null){
    ns  = new NodeStatic.Server('', {cache: 0, gzip: true});
    app = new Http.createServer(handler);
    io  = new SocketIO(app);

    new Bundler();

    validator		    = new Validator();
    authenticator   = new Authenticator();
    admin           = null;

    app.listen(8080);
    initialize();
    callback();
  }
};

module.exports = Server;

function initialize() {
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

    new VideoController(io, socket);
    new StateController(io, socket);
    new SmtpController(io, socket);
    new DatabaseController(io, socket);

    //For client side callback
    socket.emit('connected');

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

function handler(request, response) {
    console.log(request);
    request.addListener('end', function() {
      fileServer.serve(request, response);
  }).resume();
}
