var fileSystemUtils, log;

function Command() { };

Command.prototype.initialize = function(force) {
  if(typeof Command.prototype.protoInit === 'undefined') {
    Command.prototype.protoInit = true;
    fileSystemUtils = this.factory.createFileSystemUtils();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ENCODING);
  }
};

Command.prototype.parse = function(input) {
  log.debug("Command.parse", input);
  var args = [];
  var options = input.split(" -");
  var lastIndex = options.length-1;

  var keyless = getTailKeylessPathValues(options[lastIndex]);
  options[lastIndex] = options[lastIndex].substr(0, options[lastIndex].length - keyless.length-1);

  for(var i = 0; i < options.length; ++i) {
    args = args.concat(getKeyValuePair(options[i]));
  }

  if(keyless.length > 0) {
    args = args.concat(keyless.split(" "));
  }

  log.debug("Parsed Arguments: ", args);
  return args;
}
module.exports = Command;

function getKeyValuePair(pair) {
  log.debug("Command.getKeyValuePair", pair);
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

function getTailKeylessPathValues(command) {
  log.debug("Command.getTailKeylessPathValues", command)
  var keylessValues = "";
  var parms = command.split(" ");

  for(var x = 2; x < parms.length; ++x) {
    if(fileSystemUtils.isPath(parms[x])) {
      keylessValues += keylessValues == "" ? parms[x] : " " + parms[x];
    }
  }

  return keylessValues;
}
