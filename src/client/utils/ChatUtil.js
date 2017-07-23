const Promise  = require('bluebird');

var handleList, schemaFactory, socket, log;

function ChatUtil() { }

ChatUtil.prototype.initialize = function(force) {
  if(typeof ChatUtil.prototype.protoInit === 'undefined') {
    ChatUtil.prototype.protoInit = true;
    var logManager  = this.factory.createClientLogManager();
		log             = logManager.getLog(logManager.LogEnum.GENERAL);
    schemaFactory   = this.factory.createSchemaFactory();
  }

  if(force === undefined ? typeof ChatUtil.prototype.stateInit === 'undefined' : force) {
    ChatUtil.prototype.stateInit = true;
    socket = this.factory.createClientSocket();

    removeSocketEvents();
    setSocketEvents();
  }
};

ChatUtil.prototype.send = function(input) {
  if(input && input.trim().length > 0) {
    if(input.match(/^\//)) {
      var parsedInput = input.split(" ");
      var request = schemaFactory.createPopulatedSchema(schemaFactory.Enum.COMMAND, [parsedInput.shift(), parsedInput]);
      socket.request('chat-command', request);
    } else {
      var request = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STRING, [input]);
      socket.request('chat-broadcast', request);
    }
  }
};

ChatUtil.prototype.getUserHandle = function(id) {
  return handleList.get(id);
};

module.exports = ChatUtil;

function loadUserHandles(handles) {
  log.debug('ChatUtil.loadUserHandles');
  handleList = new Map(handles.data);
}

function setSocketEvents() {
  socket.setEvent('chat-handles', loadUserHandles);
}

function removeSocketEvents() {
  socket.clearEvent('chat-handles', loadUserHandles);
}
