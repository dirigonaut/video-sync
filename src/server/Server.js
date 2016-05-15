var Http        = require('http')
var NodeStatic  = require('node-static');
var SocketIO    = require('socket.io');

var Smtp          = require('./smtp/Smtp');
var Bundler       = require('./utils/Bundler');
var Session       = require('./utils/Session');
var Validator     = require('./utils/Validator');
var NeDatabase    = require('./database/NeDatabase');
var Authenticator = require('./authentication/Authenticator');

var VideoController     = require('./video/VideoController');
var StateController     = require('./state/StateController');
var SmtpController      = require('./smtp/SmtpController');
var DatabaseController  = require('./database/DatabaseController');

var app = null;
var io  = null;
var ns  = null;

var session;
var validator;
var authenticator;

function Server(callback) {
  if(app == null){
    ns  = new NodeStatic.Server('./static/', {cache: 0, gzip: true});
    app = new Http.createServer(handler);
    io  = new SocketIO(app);

    new Bundler();

    smtp            = new Smtp();
    database        = new NeDatabase();

    session         = new Session();
    validator		    = new Validator();
    authenticator   = new Authenticator()

    app.listen(8080);
    initialize();
    callback();
  }
}

module.exports = Server;

function initialize() {
  io.on('connection', function (socket) {
    console.log("socket has connected: " + socket.id + " ip:" + socket.handshake.address);
    isAdministrator(socket);
    socket.emit('connected');

    socket.on('auth-get-token', function (data) {
      console.log('auth-get-token');

      var requestSmtp = function(recipientAddress, token) {

        var sendInvitations = function(hostAddress) {
          var mailOptions = smtp.createMailOptions(hostAddress, recipientAddress, "Video-Sync Token", token, "");
          smtp.sendMail(mailOptions);
        };

        smtp.initializeTransport(session.getActiveSession().smtp, sendInvitations);
      };

      authenticator.requestToken(validator.sterilizeUser(data), socket.id, requestSmtp);
    });

    socket.on('auth-validate-token', function (data) {
      console.log('auth-validate-token');

      var attachControllers = function(token) {
        userAuthorized(socket);
      };

      authenticator.validateToken(validator.sterilizeUser(data), attachControllers);
    });

    socket.on('error', function (data) {
      console.log(data);
    });

    setTimeout(function(){
      //If the socket didn't authenticate, disconnect it
      if (!socket.auth) {
        console.log("Disconnecting socket ", socket.id);
        database.deleteTokens(socket.id);
        socket.disconnect('unauthorized');
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

function userAuthorized(socket) {
  socket.auth = true;

  var video = new VideoController(io, socket);
  var state = new StateController(io, socket);

  state.getPlayerManager().createPlayer(socket);

  socket.emit('authenticated');
}

function isAdministrator(socket) {
  if(session.getAdmin() == null) {
    if(socket.handshake.address == "::ffff:127.0.0.1"){
      session.setAdminId(socket.id);
      session.setMediaPath("./static/media/bunny/");

      new SmtpController(io, socket);
      new DatabaseController(io, socket);

      userAuthorized(socket);
    } else {
      socket.auth = false;
    }
  }
}
