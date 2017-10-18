const Redis = require('redis-server');

var server, log;

//TODO: There is an issue where the port can never be changed from the config as the startup
//process does not respect it and will always spin up 6379 instead.
function RedisServer() { };

RedisServer.prototype.initialize = function() {
  if(typeof RedisServer.prototype.protoInit === 'undefined') {
    RedisServer.prototype.protoInit = true;
    var config  = this.factory.createConfig();
    var options = config.getConfig().redisStartUp;

    if(config.getConfig().redisStartUp) {
      options.conf = config.getConfig().getRedisConfigPath;
      server = new Redis(options);
    } else {
      server = new Redis(options);
    }

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ADMINISTRATION);
  }
};

RedisServer.prototype.start = function() {
  if(server) {
    return server.open().then(() => {
      log.info("Redis server has started.");
    });
  }

  throw new Error("Redis has not been init check to make sure it has been configured properly.");
};

RedisServer.prototype.stop = function() {
  if(server) {
    return server.close().then(() => {
      log.info("Redis server has shut down.");
    });
  }

  throw new Error("Redis has not been init check to make sure it has been configured properly.");
};

module.exports = RedisServer;
