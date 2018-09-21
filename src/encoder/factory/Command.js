const REGEX = /"([^"]|\\")*"|([^-\s][\S]*)|(-[\w:-]*)/g;

function Command() { };

Command.prototype.setTemplate = function(template) {
  this.command = template;
};

Command.prototype.format = function() {
  var i = 0, args = arguments;

  this.command = this.command.replace(/{}/g, function () {
    return typeof args[i] != 'undefined' ? `${args[i++]}` : '{}';
  });

  return this.command;
};

Command.prototype.getArgs = function() {
  var regex = REGEX;
  var args = [];
  var lastIndex;

  for(var itter = regex.exec(this.command); itter; itter = regex.exec(this.command)) {
    lastIndex = regex.lastIndex;
    var value = decodeURI(itter[0]);
    args.push(value.replace(/\"/g, ''));
  }

  return args;
};

module.exports = Command;
