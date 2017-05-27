var Path        = require('path');
var Https       = require('https');
var Events      = require('events');

var Express     = require('express');
var SocketIO    = require('socket.io');

var Config         = require('../utils/Config');
var LogManager     = require('../log/LogManager');
var ServerRedis    = require('./redis/ServerRedis');
var Certificate    = require('../authentication/Certificate');
var Publisher      = require('./redis/RedisPublisher');
var RedisSocket    = require('./redis/RedisSocket');
var SocketLog      = require('../log/SocketLog');
var AuthController = require('../authentication/AuthenticationController');

var log            = LogManager.getLog(LogManager.LogEnum.GENERAL);
var app, io, server, serverRedis;

class ServerProcess extends Events {
  constructor() {
    super();
  }
}

ServerProcess.prototype.initialize = function() {
  var _this = this;
  var config = new Config();

  log.info(`Trying to start ServerProcess on port ${config.getConfig().port} with process ${process.pid}`);
  serverRedis   = new ServerRedis();

  var publisher = new Publisher();
  publisher.initialize();

  var initHttpsServer = function(pem) {
    log.debug(`Certificates found initializing ${process.pid} ServerProcess`);
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
    server.listen(0);

    var socketLog = new SocketLog();
    socketLog.setSocketIO(io);

    new AuthController(io);

    log.info(`ServerProcess ${process.pid} ready to forward.`);
    _this.emit('started');
  }

  new Certificate().getCertificates(initHttpsServer);
};

ServerProcess.prototype.getServer = function() {
  return server;
};

module.exports = ServerProcess;
