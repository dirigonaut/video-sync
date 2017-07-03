const Promise     = require('bluebird');
const Path        = require('path');
const Https       = require('https');

const Express     = require('express');
const SocketIO    = require('socket.io');

var app, io, server, serverRedis, log;

function ServerProcess() { }

ServerProcess.prototype.initialize = function() {
  if(typeof ServerProcess.prototype.protoInit === 'undefined') {
    ServerProcess.prototype.protoInit = true;

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.GENERAL);
  }
};

ServerProcess.prototype.start = Promise.coroutine(function* () {
  var config = this.factory.createConfig();

  log.info(`Trying to start ServerProcess on port ${config.getConfig().port} with process ${process.pid}`);
  serverRedis   = this.factory.createServerRedis();

  var publisher = this.factory.createRedisPublisher();
  publisher.initialize();

  var certificate = this.factory.createCertificate();
  var pem = yield certificate.getCertificates();

  log.debug(`Certificates found initializing ${process.pid} ServerProcess`);
  var options = {
    key: pem.privateKey,
    cert: pem.certificate,
    requestCert: true,
  };

  app = Express();
  server = Https.createServer(options, app);
  io = SocketIO.listen(server);

  var redisSocket = this.factory.createRedisSocket();
  redisSocket.setIO(io);

  app.use(Express.static(config.getConfig().static));
  server.listen(0);

  var socketLog = this.factory.createSocketLog();
  socketLog.setSocketIO(io);

  var authController = this.factory.createAuthenticationController();
  authController.attachIO(io);

  log.info(`ServerProcess ${process.pid} ready to forward.`);
});

ServerProcess.prototype.getServer = function() {
  return server;
};

module.exports = ServerProcess;
