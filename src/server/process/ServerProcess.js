const Promise     = require('bluebird');
const Path        = require('path');
const Https       = require('https');

const Express     = require('express');
const SocketIO    = require('socket.io');

var app, io, server, serverSubscriber, logManager, log;

function ServerProcess() { }

ServerProcess.prototype.initialize = function(force) {
  if(typeof ServerProcess.prototype.protoInit === 'undefined') {
    ServerProcess.prototype.protoInit = true;
    logManager = this.factory.createLogManager();
    log        = logManager.getLog(logManager.Enums.LOGS.GENERAL);
  }
};

ServerProcess.prototype.start = Promise.coroutine(function* () {
  var config = this.factory.createConfig();

  log.info(`Starting ServerProcess on process ${process.pid}`);
  serverSubscriber = this.factory.createServerSubscriber();

  var publisher = this.factory.createRedisPublisher();
  publisher.initialize();

  var certificate = this.factory.createCertificate();
  var pem = yield certificate.getCertificate();

  log.debug(`Certificates found, initializing ${process.pid} ServerProcess`);
  var options = {
    key: pem.key,
    cert: pem.crt,
    rejectUnauthorized: false,
    requestCert: true,
  };

  app = Express();
  server = Https.createServer(options, app);
  io = SocketIO.listen(server);

  var redisSocket = this.factory.createRedisSocket();
  redisSocket.setIO(io);

  app.use(Express.static(config.getConfig().serverInfo.staticDir));
  server.listen(0);

  var authController = this.factory.createAuthenticationController();
  authController.attachIO(io);

  log.info(`ServerProcess ${process.pid} ready.`);
});

ServerProcess.prototype.getServer = function() {
  return server;
};

module.exports = ServerProcess;
