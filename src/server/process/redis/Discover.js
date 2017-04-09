function Discover(object, message, callback) {
  if(object !== null && object !== undefined) {
    if(message !== null && message !== undefined) {
      var functionHandle = message[0];
      var functionParams = message[1] !== null && message[1] !== undefined ? message[1] : [];

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
}

modules.exports = Discover;
