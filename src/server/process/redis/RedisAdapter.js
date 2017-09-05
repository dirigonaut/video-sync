const Promise   = require('bluebird');
const Redis     = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

var publisher, client, log;

function RedisAdapter() { }

RedisAdapter.prototype.initialize = function(force) {
  if(typeof RedisAdapter.prototype.protoInit === 'undefined') {
    RedisAdapter.prototype.protoInit = true;
    var config      = this.factory.createConfig();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.GENERAL);
  }

  if(force === undefined ? typeof RedisAdapter.prototype.stateInit === 'undefined' : force) {
    RedisAdapter.prototype.stateInit = true;
    client      = Redis.createClient(config.getConfig().redis);
    publisher   = this.factory.createRedisPublisher();
  }
};

RedisAdapter.prototype.callFunction = Promise.coroutine(function* (object, message) {
  if(object && message) {
    message = JSON.parse(message);
    var key = message.pop();
    var functionHandle = message[0];
    var functionParams = message[1] ? message[1] : [];

    if(functionHandle) {
      if(typeof object[functionHandle] === 'function') {
        var response = object[functionHandle].apply(object, functionParams);

        if(response instanceof Promise) {
          response = yield response;
        }

        if(response !== undefined) {
          yield client.setAsync(key, JSON.stringify(response));
        }

        yield client.publishAsync(publisher.RespEnum.RESPONSE, key);
      } else {
        log.debug(`No function found with name ${functionHandle}`);
      }
    }
  }
});

module.exports = RedisAdapter;
