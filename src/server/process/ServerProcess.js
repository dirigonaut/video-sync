var Path        = require('path');
var Https       = require('https');
var Express     = require('express');
var SocketIO    = require('socket.io');
var SocketRedis = require('socket.io-redis');

var Config                   = require('../utils/Config');
var LogManager               = require('../log/LogManager');
var Session                  = require('../administration/Session');
var ServerRedis              = require('./redis/ServerRedis');
var Certificate              = require('../authentication/Certificate');
var Publisher                = require('./redis/RedisPublisher');
var RedisSocket              = require('./redis/RedisSocket');
var SocketLog                = require('../log/SocketLog');
var AuthenticationController = require('../authentication/AuthenticationController');

var logManager = new LogManager();
logManager.initialize();

var log         = LogManager.getLog(LogManager.LogEnum.GENERAL);
var config      = new Config();
var app         = null;
var io          = null;
var server      = null;
var serverRedis = null;

function ServerProcess() {
  logManager.addFileLogging();
  log.info(`Trying to start ServerProcess on port ${config.getConfig().port}`);

  serverRedis   = new ServerRedis();

  var publisher = new Publisher();
  publisher.initialize();

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
    io.adapter(SocketRedis({ host: `${config.getConfig().redisHost}`, port: config.getConfig().redisPort }));

    var redisSocket = new RedisSocket();
    redisSocket.initialize(io);

    var session = new Session();
    session.setIP(`${config.getConfig().host}:${config.getConfig().port}`);

    app.use(Express.static(config.getConfig().staticPath));
    server.listen(port);

    var socketLog = new SocketLog();
    socketLog.initialize(io);

    new AuthenticationController(io);
  }

  new Certificate().getCertificates(initHttpsServer);
}

module.exports = ServerProcess;
