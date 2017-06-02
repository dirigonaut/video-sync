var Redis = require('redis-server');
var Config = require('../../utils/Config');

var server;

//TODO: There is an issue where the port can never be changed from the config as the startup
//process does not respect it and will always spin up 6379 instead.
class RedisServer {
  constructor() {
    var config = new Config();
    var options = config.getConfig().redisStartUp;

    if(options) {
      options.conf = config.getRedisConfigPath();
    }

    if(options !== undefined && options !== null) {
      server = new Redis(options);
    }
  }

  start() {
    if(server !== undefined && server !== null) {
      return server.open().then(() => {
        console.log("Redis server has started.");
      });
    }

    throw new Error("Redis has not been init check to make sure it has been configured properly.");
  }

  end() {
    if(server !== undefined && server !== null) {
      return server.close().then(() => {
        console.log("Redis server has shut down.");
      });
    }

    throw new Error("Redis has not been init check to make sure it has been configured properly.");
  }
}

module.exports = RedisServer;
