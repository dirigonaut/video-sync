function Discover() {
  
}

Discover.prototype.discover = function(object, message, callback) {
  if(object !== null && object !== undefined) {
    if(message !== null && message !== undefined) {
      var functionHandle = message[0];
      var functionParams = message[1] !== null && message[1] !== undefined ? message[1] : [];

      console.log(`Discovering function ${functionHandle} for object ${object.constructor.name}`);
      if(callback !== null && callback !== undefined) {
        functionParams.push(callback);
      }

      if(functionHandle !== null && functionHandle !== undefined) {
        if(object[functionHandle] === 'function') {
          object.call(object, functionHandle, functionParams);
        } else {
          callback(`No function found with name ${functionHandle}`);
        }
      }
    }
  }
};

module.exports = Discover;
