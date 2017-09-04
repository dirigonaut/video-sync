const Promise  = require('bluebird');

var handleList, schemaFactory, socket, eventKeys, log;

function ChatUtil() { }

ChatUtil.prototype.initialize = function(force) {
  if(typeof ChatUtil.prototype.protoInit === 'undefined') {
    ChatUtil.prototype.protoInit = true;
    schemaFactory   = this.factory.createSchemaFactory();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createClientLogManager();
		log             = logManager.getLog(logManager.LogEnum.GENERAL);
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
      var request = schemaFactory.createPopulatedSchema(schemaFactory.Enum.COMMAND, [parsedInput.shift(), parsedInput.length > 0 ? parsedInput : undefined]);
      socket.request(eventKeys.COMMAND, request);
    } else {
      var request = schemaFactory.createPopulatedSchema(schemaFactory.Enum.SPECIAL, [input]);
      socket.request(eventKeys.BROADCAST, request);
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
  socket.setEvent(eventKeys.HANDLES, loadUserHandles);
}

function removeSocketEvents() {
  socket.removeEvent(eventKeys.HANDLES, loadUserHandles);
}
