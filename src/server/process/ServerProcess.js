var Path        = require('path');
var Https       = require('https');
var Express     = require('express');
var SocketIO    = require('socket.io');

var LogManager               = require('../log/LogManager');
var Session                  = require('../administration/Session');
var ServerRedis              = require('./redis/ServerRedis');
var AuthenticationController = require('../authentication/AuthenticationController');

var logManager = new LogManager();

var app         = null;
var io          = null;
var server      = null;
var serverRedis = null;

function ServerProcess(ip, port, appData, staticPath) {
  serverRedis = new ServerRedis();
  logManager.addFileLogging(appData);

  var initHttpsServer = function(pem) {
    var options = {
      key: pem.privateKey,
      cert: pem.certificate,
      requestCert: true,
      ciphers: 'ECDHE-RSA-AES256-SHA:AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
      honorCipherOrder: true
    };

    app = Express();
    server = Https.createServer(options, app);
    io = SocketIO.listen(server);

    var session = new Session();
    session.onAdminIdCallback(adminSocketLogging);
    session.setLocalIp(`${ip}:${port}`);

    app.use(Express.static(staticPath));
    server.listen(port);

    new AuthenticationController(io);
  }

  new Certificate().getCertificates(initHttpsServer);
}

module.exports = ServerProcess;
