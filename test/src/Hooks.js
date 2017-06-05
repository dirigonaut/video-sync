const Promise = require('bluebird');
const Redis   = require('redis');
const should  = require('should');

const RedisServer     = require('../../src/server/process/redis/RedisServer');
const Config          = require('../../src/server/utils/Config');
const RedisPublisher  = require('../../src/server/process/redis/RedisPublisher');

Promise.promisifyAll(Redis.RedisClient.prototype);

var config;
var redisServer;

var client;

before(Promise.coroutine(function* () {
  var config = new Config();
  yield config.initialize().catch(console.error);

  redisServer = new RedisServer();
  yield redisServer.start();

  client = Redis.createClient(config.getConfig().redis);
}));

after(Promise.coroutine(function* () {
  yield redisServer.end();
  client.end();
}));

beforeEach(Promise.coroutine(function* () {
  console.log("Flushing Redis");
  return client.flushdbAsync();
}));
