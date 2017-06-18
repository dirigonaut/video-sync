const Promise   = require('bluebird');
const Redis     = require('redis');
const Config    = require('../../utils/Config');
const Publisher = require('./RedisPublisher');

Promise.promisifyAll(Redis.RedisClient.prototype);

var client, config;

function lazyInit() {
  config      = new Config();
  client      = Redis.createClient(config.getConfig().redis);
}

function ReflectiveAdapter() { }

ReflectiveAdapter.prototype.initialize = function() {
  if(typeof ReflectiveAdapter.prototype.lazyInit === 'undefined') {
    lazyInit();
    ReflectiveAdapter.prototype.lazyInit = true;
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
          var response;
          response = object[functionHandle].apply(object, functionParams);

          if(response.isFulfilled) {
            response = yield response;
          }

          if(response) {
            yield client.setAsync(key, JSON.stringify(response));
            yield client.publishAsync(Publisher.RespEnum.RESPONSE, key);
          }
        } else {
          console.log(`No function found with name ${functionHandle}`);
        }
      }
    }
  }
});

module.exports = ReflectiveAdapter;
