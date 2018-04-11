const REGEX = /"([^"]|\\")*"|([^-\s][\S]*)|(-[\w:-]*)/g;

const MEDIA_DIR = '{mediaDir}';

function Command() { };

Command.prototype.parse = function(str, mediaDir) {
  var regex = REGEX;
  var args = [];
  var lastIndex;

  for(var itter = regex.exec(str); itter; itter = regex.exec(str)) {
    lastIndex = regex.lastIndex;
    var value = decodeURI(itter[0]);
    value = value.replace(MEDIA_DIR, mediaDir);
    args.push(value.replace(/\"/g, ''));
  }

  return args;
};

module.exports = Command;
