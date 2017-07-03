var Redis = require('redis-server');

var server, config, log;

//TODO: There is an issue where the port can never be changed from the config as the startup
//process does not respect it and will always spin up 6379 instead.
function RedisServer() { };

RedisServer.prototype.initialize = function(force) {
  if(typeof RedisServer.prototype.protoInit === 'undefined') {
    config 			= this.factory.createConfig();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ADMINISTRATION);

    RedisServer.prototype.protoInit = true;
  }

  if(typeof RedisServer.prototype.stateInit === 'undefined' || force) {
    var options = config.getConfig().redisStartUp;

    if(options) {
      options.conf = config.getRedisConfigPath();
    }

    if(options !== undefined && options !== null) {
      server = new Redis(options);
    }

    RedisServer.prototype.stateInit = true;
  }
};

RedisServer.prototype.start = function() {
  if(server !== undefined && server !== null) {
    return server.open().then(() => {
      log.info("Redis server has started.");
    });
  }

  throw new Error("Redis has not been init check to make sure it has been configured properly.");
};

RedisServer.prototype.stop = function() {
  if(server !== undefined && server !== null) {
    return server.close().then(() => {
      log.info("Redis server has shut down.");
    });
  }

  throw new Error("Redis has not been init check to make sure it has been configured properly.");
};

module.exports = RedisServer;
