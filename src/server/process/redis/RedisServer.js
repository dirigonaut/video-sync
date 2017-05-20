var Redis = require('redis-server');
var Config = require('../../utils/Config');

var server = null;

class RedisServer {
  constructor() {
    var config = new Config();
    var options;

    var redisPath = config.getConfig().redisPath;
    var redisConfig = config.getRedisConfig();

    if(redisPath !== undefined && redisPath !== null) {
      options = {
        conf: redisConfig
      };
    }

    if(options !== undefined && options !== null) {
      server = new Redis(options);
    }
  }

  start(callback) {
    if(server !== undefined && server !== null) {
      server.open((err) => {
        if (err === null) {
          console.log("Redis server is up.");
          callback();
        } else {
          console.log(err);
        }
      });
    } else {
      console.log("Redis has not been init check to make sure it has been configured properly.");
      callback();
    }
  }

  end() {
    if(server !== undefined && server !== null) {
      server.close().then(() => {
        console.log("Redis server has shut down.");
      });
    } else {
      console.log("Redis has not been init check to make sure it has been configured properly.");
    }
  }
}

module.exports = RedisServer;
