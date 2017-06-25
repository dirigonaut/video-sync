var Redis = require('redis-server');

var server;

//TODO: There is an issue where the port can never be changed from the config as the startup
//process does not respect it and will always spin up 6379 instead.
function RedisServer() { };

RedisServer.prototype.initialize = function() {
  var options = this.config.getConfig().redisStartUp;

  if(options) {
    options.conf = this.config.getRedisConfigPath();
  }

  if(options !== undefined && options !== null) {
    server = new Redis(options);
  }
};

RedisServer.prototype.start = function() {
  if(server !== undefined && server !== null) {
    return server.open().then(() => {
      console.log("Redis server has started.");
    });
  }

  throw new Error("Redis has not been init check to make sure it has been configured properly.");
};

RedisServer.prototype.stop = function() {
  if(server !== undefined && server !== null) {
    return server.close().then(() => {
      console.log("Redis server has shut down.");
    });
  }

  throw new Error("Redis has not been init check to make sure it has been configured properly.");
};

module.exports = RedisServer;
