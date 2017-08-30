const REGEX = /"[\w,.-=:\s]*"|[^-\s][\S]*|-[\w:-]*/g;

function Command() { };

Command.prototype.parse = function(str) {
  var regex = REGEX;
  var args = [];
  var lastIndex;

  for(var itter = regex.exec(str); itter; itter = regex.exec(str)) {
    lastIndex = regex.lastIndex;
    args.push(itter[0]);
  }

  var output = str.substring(lastIndex, str.length).trim();
  if(output.length > 0) {
    args.push(output);
  }

  return args;
};

module.exports = Command;
