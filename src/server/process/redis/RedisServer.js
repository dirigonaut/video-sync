const Redis = require('redis-server');
const server = new Redis({port: 6379});

function RedisServer() {

}

RedisServer.prototype.start = function() {
  server.open((err) => {
    if (err === null) {
      console.log("Redis server is up.");
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
