var FileUtils = require('../../../utils/FileSystemUtils');
var LogManager  = require('../../../log/LogManager');

var log = LogManager.getLog(LogManager.LogEnum.ENCODING);
var fileUtils = new FileUtils();

function Command(input) {
  log.debug("Command", input);
  var args = [];
  var options = input.split(" -");
  var lastIndex = options.length-1;

  var keyless = Command._getTailKeylessPathValues(options[lastIndex]);
  options[lastIndex] = options[lastIndex].substr(0, options[lastIndex].length - keyless.length-1);

  for(var i = 0; i < options.length; ++i) {
    args = args.concat(Command._getKeyValuePair(options[i]));
  }

  if(keyless.length > 0) {
    args = args.concat(keyless.split(" "));
  }

  log.debug("Parsed Arguments: ", args);
  return args;
}

Command._getKeyValuePair = function(pair) {
  log.debug("Command._getKeyValuePair", pair);
  var keyValuePair = [];
  var command = pair.split(" ");
  var key = command.shift();
  var value = "";

  if(key !== null && key.trim() !== ""){
    key = "-" + key;
    keyValuePair.push(key);

    command.forEach(function(item){
      value += value.length>1 ? " " + item : item;
    });
  }

  if(value !== null && value.trim() !== "") {
    keyValuePair.push(value);
  }

  return keyValuePair;
}

Command._getTailKeylessPathValues = function(command) {
  log.debug("Command._getTailKeylessPathValues", command)
  var keylessValues = "";
  var parms = command.split(" ");

  for(var x = 2; x < parms.length; ++x) {
    if(fileUtils.isPath(parms[x])) {
      keylessValues += keylessValues == "" ? parms[x] : " " + parms[x];
    }
  }

  return keylessValues;
}

module.exports = Command;
