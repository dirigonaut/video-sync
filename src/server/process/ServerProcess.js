var Path        = require('path');
var Https       = require('https');
var Events      = require('events');

var Express     = require('express');
var SocketIO    = require('socket.io');

var Config         = require('../utils/Config');
var LogManager     = require('../log/LogManager');
var Session        = require('../administration/Session');
var ServerRedis    = require('./redis/ServerRedis');
var Certificate    = require('../authentication/Certificate');
var Publisher      = require('./redis/RedisPublisher');
var RedisSocket    = require('./redis/RedisSocket');
var SocketLog      = require('../log/SocketLog');
var AuthController = require('../authentication/AuthenticationController');

var log         = LogManager.getLog(LogManager.LogEnum.GENERAL);
var config      = new Config();

var app         = null;
var io          = null;
var server      = null;
var serverRedis = null;

class ServerProcess extends Events {
  constructor() {
    super();
  }

  initialize() {    
    var _this = this;
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
      io = SocketIO.listen(server);

      var redisSocket = new RedisSocket();
      redisSocket.initialize(io);

      app.use(Express.static(config.getConfig().static));
      server.listen(0, 'localhost');

      var socketLog = new SocketLog();
      socketLog.initialize(io);

      new AuthController(io);

      _this.emit('started');
    }

    new Certificate().getCertificates(initHttpsServer);
  }

  getServer() {
    return server;
  }
}

module.exports = ServerProcess;
