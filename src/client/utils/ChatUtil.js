const util          = require('util');
const EventEmitter  = require('events');

var ClientSocket    = require('../socket/ClientSocket.js');

var clientSocket = new ClientSocket();

var handleList = null;

function ChatUtil() {

}

util.inherits(ChatUtil, EventEmitter);

ChatUtil.prototype.parseInput = function(input) {
  var parsedInput = input.split(" ");
  return this.createCommand(parsedInput.shift(), parsedInput);
};

ChatUtil.prototype.createMessage = function(text) {
  var message = {};
  message.text = text;
  return message;
};

ChatUtil.prototype.createCommand = function(command, param) {
  var request = {};
  request.command = command;
  request.param = param;
  return request;
};

ChatUtil.prototype.setupEvents = function() {
  clientSocket.clearEvent('chat-handles', loadUserHandles);
  clientSocket.setEvent('chat-handles', loadUserHandles);
};

ChatUtil.prototype.getUserHandle = function(id) {
  return handleList.get(id);
};

module.exports = ChatUtil;

function loadUserHandles(data) {
  console.log('Got Handles');
  console.log(data);
  handleList = new Map(data);
}
