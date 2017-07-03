const Promise   = require('bluebird');
const Redis     = require('redis');
const Publisher = require('./RedisPublisher');

Promise.promisifyAll(Redis.RedisClient.prototype);

var client, log;

function ReflectiveAdapter() { }

ReflectiveAdapter.prototype.initialize = function() {
  if(typeof ReflectiveAdapter.prototype.protoInit === 'undefined') {
    ReflectiveAdapter.prototype.protoInit = true;

    var config = this.factory.createConfig();
    client = Redis.createClient(config.getConfig().redis);

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.GENERAL);
  }
};

ReflectiveAdapter.prototype.callFunction = Promise.coroutine(function* (object, message) {
  if(object !== null && object !== undefined) {
    if(message !== null && message !== undefined) {
      message = JSON.parse(message);
      var key = message.pop();
      var functionHandle = message[0];
      var functionParams = message[1] !== null && message[1] !== undefined ? message[1] : [];

      if(functionHandle) {
        if(typeof object[functionHandle] === 'function') {
          var response = yield object[functionHandle].apply(object, functionParams);

          if(response) {
            yield client.setAsync(key, JSON.stringify(response));
          }

          yield client.publishAsync(Publisher.RespEnum.RESPONSE, key);
        } else {
          log.debug(`No function found with name ${functionHandle}`);
        }
      }
    }
  }
});

module.exports = ReflectiveAdapter;
