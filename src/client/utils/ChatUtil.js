const util          = require('util');
const EventEmitter  = require('events');

var self = null;

function ChatUtil() {
  if(self == null) {
    self = this;
  }
}

util.inherits(ChatUtil, EventEmitter);

ChatUtil.prototype.parseInput = function(input, from) {
  var parsedInput = "regex parse input";

  if(false) {
    return this._createCommand(input);
  } else {
    return this._createMessage(input, from);
  }
};

ChatUtil.prototype._createMessage = function(text, from) {
  var message = new Object();
  message.text = text;
  message.from = from;
  return message;
};

ChatUtil.prototype._createCommand = function() {

};

ChatUtil.prototype.clientLog = function(caller, log) {
  this._createMessage(caller, log);
  self.emit('client-log', log);
};

module.exports = ChatUtil;
