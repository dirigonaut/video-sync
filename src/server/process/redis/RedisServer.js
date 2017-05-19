var Redis = require('redis-server');
var Config = require('../../utils/Config');

var server = null;

function RedisServer() {
  var config = new Config();

  server = new Redis({
    bin: config.getConfig().redisPath,
    conf: config.getRedisConfig()
  });
}

RedisServer.prototype.start = function(callback) {
  server.open((err) => {
    if (err === null) {
      console.log("Redis server is up.");
      callback();
    } else {
      console.log(err);
    }
  });
};

RedisServer.prototype.end = function() {
  server.close().then(() => {
    console.log("Redis server has shut down.");
  });
};

module.exports = RedisServer;
