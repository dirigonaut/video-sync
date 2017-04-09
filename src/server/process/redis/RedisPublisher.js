var Redis = require("redis");

var publisher = new Redis.createClient();

function RedisPublisher() {
}

RedisPublisher.prototype.publish = function(channel, args, callback) {
  publisher.publish(channel, args, callback);
};

RedisPublisher.Enum = { DATABASE: 'database', STATE: 'state', PLAYER: 'player', SESSION: 'session'};

module.exports = RedisPublisher;
