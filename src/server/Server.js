var Path        = require('path');
var Https       = require('https');
var Express     = require('express');
var SocketIO    = require('socket.io');

var Session       = require('./administration/Session');
var NeDatabase    = require('./database/NeDatabase');
var Certificate   = require('./authentication/Certificate');
var PlayerManager = require('./player/PlayerManager');
var LogManager    = require('./log/LogManager');

var AuthenticationController = require('./authentication/AuthenticationController');

var logManager = new LogManager();
logManager.initialize();

var app = null;
var io  = null;
var server  = null;

function Server(ip, port, appData, staticPath) {
  var app = Express();

  logManager.addFileLogging(appData);

  var database = new NeDatabase();
  database.initialize(appData);

  var initHttpsServer = function(pem) {
    console.log("initHttpsServer")
    var options = {
      key: pem.privateKey,
      cert: pem.certificate,
      requestCert: true,
      ciphers: 'ECDHE-RSA-AES256-SHA:AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
      honorCipherOrder: true
    };

    server = Https.createServer(options, app);
    io = SocketIO.listen(server);

    var adminSocketLogging = function(id) {
      console.log("Adding Socket Logging");
      var playerManager = new PlayerManager();
      var socket = playerManager.getPlayer(id).socket;
      logManager.addSocketLogging(socket, database);
    };

    var session = new Session();
    session.onAdminIdCallback(adminSocketLogging);
    session.setLocalIp(`${ip}:${port}`);

    app.use(Express.static(staticPath));
    server.listen(port);

    new AuthenticationController(io);
  };

  new Certificate().getCertificates(initHttpsServer);
}

module.exports = Server;
