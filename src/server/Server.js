var Https       = require('https');
var Express     = require('express');
var SocketIO    = require('socket.io');

var Smtp          = require('./smtp/Smtp');
var Bundler       = require('./utils/Bundler');
var Session       = require('./utils/Session');
var Validator     = require('./utils/Validator');
var NeDatabase    = require('./database/NeDatabase');
var Certificate   = require('./utils/Certificate');
var PlayerManager = require('./state/player/PlayerManager.js');
var Authenticator = require('./authentication/Authenticator');

var AdminController     = require('./administration/AdminController');
var VideoController     = require('./video/VideoController');
var StateController     = require('./state/StateController');
var SmtpController      = require('./smtp/SmtpController');
var DatabaseController  = require('./database/DatabaseController');

var app = null;
var io  = null;
var server  = null;

var session;
var validator;
var authenticator;

function Server(ip, port, callback) {
  app = Express();

  var initHttpsServer = function(cert) {
    server = Https.createServer({key: cert.private,
      cert: cert.cert}, app);

    io = SocketIO(server);

    new Bundler();

    smtp            = new Smtp();
    database        = new NeDatabase();

    session         = new Session();
    validator		    = new Validator();
    authenticator   = new Authenticator();

    session.setLocalIp(ip + ":" + port);

    app.use(Express.static('static'));
    server.listen(port);

    initialize();
    callback();
  };

  new Certificate().getCertificates(initHttpsServer);
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
        console.log(recipientAddress);
        console.log(token);
        var sendInvitations = function(hostAddress) {
          var mailOptions = smtp.createMailOptions(session.getActiveSession().smtp, recipientAddress, "Video-Sync Token", "Session token: " + token.token, "");
          smtp.sendMail(mailOptions);
        };

        smtp.initializeTransport(session.getActiveSession().smtp, sendInvitations);
      };

      authenticator.requestToken(socket.id, validator.sterilizeUser(data), requestSmtp);
    });

    socket.on('auth-validate-token', function (data) {
      console.log('auth-validate-token');

      var attachControllers = function(token) {
        userAuthorized(socket);
      };

      authenticator.validateToken(socket.id, validator.sterilizeUser(data), attachControllers);
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

function userAuthorized(socket) {
  socket.auth = true;

  var video = new VideoController(io, socket);
  var state = new StateController(io, socket);

  new PlayerManager().createPlayer(socket);

  socket.emit('authenticated');

  if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
    socket.emit('media-ready');
  }
}

function isAdministrator(socket) {
  socket.auth = false;

  if(session.getAdmin() == null) {
    if(socket.handshake.address == "::ffff:127.0.0.1"){
      session.setAdminId(socket.id);

      new AdminController(io, socket);
      new SmtpController(io, socket);
      new DatabaseController(io, socket);

      userAuthorized(socket);
    }
  }
}
