var Https       = require('https');
var Express     = require('express');
var SocketIO    = require('socket.io');

var Bundler       = require('./utils/Bundler');
var Session       = require('./administration/Session');
var Log           = require('./utils/Logger');
var NeDatabase    = require('./database/NeDatabase');
var Certificate   = require('./authentication/Certificate');

var AuthenticationController = require('./authentication/AuthenticationController');

var app = null;
var io  = null;
var server  = null;

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

    var session = new Session();
    session.setLocalIp(ip + ":" + port);

    app.use(Express.static('static'));
    server.listen(port);

    new AuthenticationController(io);
    callback();
  };

  var database = new NeDatabase(appData);
  new Certificate().getCertificates(initHttpsServer);
}

module.exports = Server;
