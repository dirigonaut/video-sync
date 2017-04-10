function Discover() {

}

Discover.prototype.discover = function(object, message) {
  if(object !== null && object !== undefined) {
    if(message !== null && message !== undefined) {
      message = JSON.parse(message);
      var functionHandle = message[0];
      var functionParams = message[1] !== null && message[1] !== undefined ? message[1] : [];

      console.log(`Discovering function ${functionHandle} for object ${object.constructor.name}`);
      if(functionHandle !== null && functionHandle !== undefined) {
        if(typeof object[functionHandle] === 'function') {
          object[functionHandle].apply(object, functionParams);
        } else {
          console.log(`No function found with name ${functionHandle}`);
        }
      }
    }
  }
};

module.exports = Discover;
