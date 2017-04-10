var Path        = require('path');
var Https       = require('https');
var Express     = require('express');
var SocketIO    = require('socket.io');
var SocketRedis = require('socket.io-redis');

var LogManager               = require('../log/LogManager');
var Session                  = require('../administration/Session');
var ServerRedis              = require('./redis/ServerRedis');
var Certificate              = require('../authentication/Certificate');
var Publisher                = require('./redis/RedisPublisher');
var RedisSocket              = require('./redis/RedisSocket');
var AuthenticationController = require('../authentication/AuthenticationController');

var logManager = new LogManager();
logManager.initialize();

var log         = LogManager.getLog(LogManager.LogEnum.GENERAL);
var app         = null;
var io          = null;
var server      = null;
var serverRedis = null;

function ServerProcess(ip, port, appData, staticPath) {
  logManager.addFileLogging(appData);
  log.info(`Trying to start ServerProcess on port ${port}`);

  serverRedis   = new ServerRedis();

  var publisher = new Publisher();
  publisher.initialize();

  logManager.addFileLogging(appData);

  var initHttpsServer = function(pem) {
    log.debug('Certificates found starting ServerProcess');
    var options = {
      key: pem.privateKey,
      cert: pem.certificate,
      requestCert: true,
    };

    app = Express();
    server = Https.createServer(options, app);
    io = SocketIO.listen(server)
    io.adapter(SocketRedis({ host: 'localhost', port: 6379 }));

    var redisSocket = new RedisSocket();
    redisSocket.initialize(io);

    var session = new Session();
    session.setLocalIp(`${ip}:${port}`);

    app.use(Express.static(staticPath));
    server.listen(port);

    new AuthenticationController(io);
  }

  new Certificate().getCertificates(initHttpsServer);
}

module.exports = ServerProcess;
