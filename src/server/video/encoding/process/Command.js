const REGEX = /-[A-Za-z:_-]*\s"[A-Za-z0-9=,\s]*"|-[A-Za-z:_-]*\s[^-][0-9A-Za-z-_"/\\.]*|-[A-Za-z:_-]*/g;

function Command() { };

Command.prototype.parse = function(str) {
  var regex = REGEX;
  var args = [];
  var lastIndex;

  for(var itter = regex.exec(str); itter; itter = regex.exec(str)) {
    lastIndex = regex.lastIndex;
    args.push(itter[0]);
  }

  return args.push(str.substring(lastIndex, str.length));
};

module.exports = Command;
