var Redis = require("redis");

var client = Redis.createClient();

function ReflectiveAdapter() {

}

ReflectiveAdapter.prototype.callFunction = function(object, message) {
  if(object !== null && object !== undefined) {
    if(message !== null && message !== undefined) {
      message = JSON.parse(message);
      var key = message.pop();
      var functionHandle = message[0];
      var functionParams = message[1] !== null && message[1] !== undefined ? message[1] : [];

      //console.log(`${key}: Discovering function ${functionHandle} for object ${object.constructor.name}`);
      if(functionHandle !== null && functionHandle !== undefined) {
        if(typeof object[functionHandle] === 'function') {
          var pushDataToRedis = function(response) {
            var onSuccess = function(err, data) {
              if(err === null) {
                //console.log(`${key}: Response for ${functionHandle} for object ${object.constructor.name}`)
                client.publish("stateRedisResponse", key);
              }
            };

            client.set(key, JSON.stringify(response), onSuccess);
          };

          functionParams.push(pushDataToRedis);
          object[functionHandle].apply(object, functionParams);
        } else {
          console.log(`No function found with name ${functionHandle}`);
        }
      }
    }
  }
};

module.exports = ReflectiveAdapter;
