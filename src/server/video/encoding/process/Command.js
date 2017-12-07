const REGEX = /"([^"]|\\")*"|([^-\s][\S]*)|(-[\w:-]*)/g;

function Command() { };

Command.prototype.parse = function(str) {
  var regex = REGEX;
  var args = [];
  var lastIndex;

  for(var itter = regex.exec(str); itter; itter = regex.exec(str)) {
    lastIndex = regex.lastIndex;
    var value = decodeURI(itter[0]);
    args.push(value.replace(/\"/g, ''));
  }

  var output = str.substring(lastIndex, str.length).trim();
  output = decodeURI(output);
  if(output.length > 0) {
    args.push(output);
  }

  return args;
};

module.exports = Command;
