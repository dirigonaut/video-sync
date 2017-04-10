var Redis = require('redis-server');

var server = new Redis({port: 6379});

function RedisServer() {

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
