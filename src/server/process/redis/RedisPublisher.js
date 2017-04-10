var Redis = require("redis");

var publisher = publisher = Redis.createClient();;

function RedisPublisher() {

}

RedisPublisher.prototype.publish = function(channel, args, callback) {
  publisher.publish(channel, JSON.stringify(args), response);
};

RedisPublisher.Enum = { DATABASE: 'database', STATE: 'state', PLAYER: 'player', SESSION: 'session'};

module.exports = RedisPublisher;

publisher.on("connect", function(err) {
  console.log("RedisPublisher is connected to redis server");
});

publisher.on("reconnecting", function(err) {
  console.log("RedisPublisher is connected to redis server");
});

publisher.on("error", function(err) {
  console.log(err);
});
