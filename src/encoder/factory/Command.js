const REGEX = /"([^"]|\\")*"|([^-\s][\S]*)|(-[\w:-]*)/g;
function Command() { };

Command.prototype.setTemplate = function(template) {
  this.command = template;
};

Command.prototype.setArgs = function() {
  this.args = Array.prototype.slice.call(arguments);
};

Command.prototype.format = function(index, input) {
  var i = 0;
  return this.command.replace(/{}/g, function () {
    var value = i++ === index && typeof input != "undefined" ? input : "{}";
    return value;
 });
};

Command.prototype.getOutput = function() {
  if(this.args && this.args.length) {
    return this.args[this.args.length - 1];
  }
};

Command.prototype.getArgs = function() {
  var regex = REGEX;
  var args = [];
  var lastIndex;
  var formatArgs = Array.prototype.slice.call(this.args);

  for(var itter = regex.exec(this.command); itter; itter = regex.exec(this.command)) {
    lastIndex = regex.lastIndex;
    var value = itter[0];
    value = value.replace(/\"/g, "");

    if(value.match(/{}/g)) {
      var replacement = formatArgs.shift();

      if(replacement !== undefined) {
        if(Array.isArray(replacement)) {
          for(let entry of replacement) {
            value = value.replace(/{}/, entry);
          }
        } else {
          value = value.replace(/{}/, replacement);
        }
      }
    }

    args.push(value);
  }

  return args;
};

module.exports = Command;
