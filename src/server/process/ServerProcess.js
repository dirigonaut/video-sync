const Promise     = require('bluebird');
const Path        = require('path');
const Https       = require('https');

const Express     = require('express');
const SocketIO    = require('socket.io');

const Config         = require('../utils/Config');
const LogManager     = require('../log/LogManager');
const ServerRedis    = require('./redis/ServerRedis');
const Certificate    = require('../authentication/Certificate');
const Publisher      = require('./redis/RedisPublisher');
const RedisSocket    = require('./redis/RedisSocket');
const SocketLog      = require('../log/SocketLog');
const AuthController = require('../authentication/AuthenticationController');

var log              = LogManager.getLog(LogManager.LogEnum.GENERAL);
var app, io, server, serverRedis;

class ServerProcess { }

ServerProcess.prototype.initialize = Promise.coroutine(function* () {
  var config = new Config();

  log.info(`Trying to start ServerProcess on port ${config.getConfig().port} with process ${process.pid}`);
  serverRedis   = new ServerRedis();

  var publisher = new Publisher();
  publisher.initialize();

  var pem = yield new Certificate().getCertificates();

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
};

ServerProcess.prototype.getServer = function() {
  return server;
};

module.exports = ServerProcess;
