var Https       = require('https');
var Express     = require('express');
var SocketIO    = require('socket.io');

var Smtp          = require('./administration/Smtp');
var Bundler       = require('./utils/Bundler');
var Session       = require('./administration/Session');
var Log           = require('./utils/Logger');
var UserAdmin     = require('./administration/UserAdministration');
var Validator     = require('./authentication/Validator');
var NeDatabase    = require('./database/NeDatabase');
var Certificate   = require('./authentication/Certificate');
var PlayerManager = require('./state/player/PlayerManager.js');
var Authenticator = require('./authentication/Authenticator');

var AdminController     = require('./administration/AdminController');
var VideoController     = require('./video/VideoController');
var StateController     = require('./state/StateController');
var DatabaseController  = require('./database/DatabaseController');
var ChatController      = require('./chat/ChatController');

var app = null;
var io  = null;
var server  = null;

var session;
var userAdmin;
var validator;
var authenticator;

function Server(ip, port, appData, callback) {
  app = Express();

  var initHttpsServer = function(pem) {
    var options = {
      key: pem.privateKey,
      cert: pem.certificate,
      requestCert: true,
      ciphers: 'ECDHE-RSA-AES256-SHA:AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
      honorCipherOrder: true
    };

    server = Https.createServer(options, app);
    io = SocketIO.listen(server);

    new Bundler();

    smtp            = new Smtp();

    session         = new Session();
    userAdmin       = new UserAdmin();
    validator		    = new Validator();
    authenticator   = new Authenticator();

    session.setLocalIp(ip + ":" + port);

    app.use(Express.static('static'));
    server.listen(port);

    initialize();
    callback();
  };

  database = new NeDatabase(appData);
  new Certificate().getCertificates(initHttpsServer);
}

module.exports = Server;

function initialize() {
  io.on('connection', function (socket) {
    Log.trace("socket has connected: " + socket.id + " ip:" + socket.handshake.address);
    socket.logonAttempts = 0;
    isAdministrator(socket, io);
    socket.emit('connected');

    socket.on('auth-get-token', function (data) {
      Log.trace('auth-get-token');

      var requestSmtp = function(token) {
        var sendInvitations = function(hostAddress) {
          var mailOptions = smtp.createMailOptions(session.getActiveSession().smtp, token.address, "Video-Sync Token", "Session token: " + token.token, "");
          smtp.sendMail(mailOptions);
        };

        smtp.initializeTransport(session.getActiveSession().smtp, sendInvitations);
      };

      authenticator.requestToken(socket.id, validator.sterilizeUser(data), requestSmtp);
    });

    socket.on('auth-validate-token', function (data) {
      Log.trace('auth-validate-token');

      var loginAttempt = function(authorized) {
        if(authorized) {
          userAuthorized(socket, io);
        } else {
          socket.logonAttempts += 1;

          if(socket.logonAttempts > 4) {
            userAdmin.disconnectSocket(socket);
          }
        }
      };

      authenticator.validateToken(socket.id, validator.sterilizeUser(data), loginAttempt);
    });

    socket.on('disconnect', function() {
      var manager = new PlayerManager();
      manager.removePlayer(socket.id);
      userAdmin.disconnectSocket(socket);
    });

    socket.on('error', function (data) {
      Log.trace(data);
    });

    setTimeout(function(){
      //If the socket didn't authenticate, disconnect it
      if (!socket.auth) {
        userAdmin.disconnectSocket(socket);
      }
    }, 300000);
  });
}

function userAuthorized(socket, io) {
  socket.auth = true;

  var video = new VideoController(io, socket);
  var state = new StateController(io, socket);
  var chat = new ChatController(io, socket);

  var manager = new PlayerManager();
  manager.createPlayer(socket);
  socket.emit('authenticated');

  if(session.getMediaPath() != null && session.getMediaPath().length > 0) {
    socket.emit('media-ready');
  }

  io.emit('chat-handles', manager.getHandles());
}

function isAdministrator(socket, io) {
  socket.auth = false;

  if(session.getAdmin() == null) {
    if(socket.handshake.address == "::ffff:127.0.0.1"){
      session.setAdminId(socket.id);

      new Log(socket);
      Log.setLevel(Log.Enum.TRACE);

      new AdminController(io, socket);
      new DatabaseController(io, socket);

      userAuthorized(socket, io);
    }
  }
}
