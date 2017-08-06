const Promise   = require('bluebird');
const Redis     = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

var publisher, client, log;

function ReflectiveAdapter() { }

ReflectiveAdapter.prototype.initialize = function(force) {
  if(typeof ReflectiveAdapter.prototype.protoInit === 'undefined') {
    ReflectiveAdapter.prototype.protoInit = true;
    var config      = this.factory.createConfig();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.GENERAL);
  }

  if(force === undefined ? typeof ReflectiveAdapter.prototype.stateInit === 'undefined' : force) {
    ReflectiveAdapter.prototype.stateInit = true;
    client      = Redis.createClient(config.getConfig().redis);
    publisher   = this.factory.createRedisPublisher();
  }
};

ReflectiveAdapter.prototype.callFunction = Promise.coroutine(function* (object, message) {
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

module.exports = ReflectiveAdapter;
