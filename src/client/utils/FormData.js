const Promise  = require('bluebird');

var tokenList, socket, eventKeys, log;

function FormData() { }

FormData.prototype.initialize = function() {
  if(typeof FormData.prototype.protoInit === 'undefined') {
    FormData.prototype.protoInit = true;
    socket    = this.factory.createClientSocket();
    eventKeys = this.factory.createKeys();
    tokenList = [];

    var logManager  = this.factory.createClientLogManager();
		log             = logManager.getLog(logManager.Enums.LOGS.GENERAL);

    removeSocketEvents();
    setSocketEvents();
  }
};

FormData.prototype.getTokenList = function() {
  return tokenList;
};

module.exports = FormData;

function setSocketEvents() {
  log.debug("FormData.setSocketEvents");
  socket.setEvent(eventKeys.TOKENS, tokens);
}

function removeSocketEvents() {
  socket.removeEvent(eventKeys.TOKENS, tokens);
}

function tokens(response){
  log.debug('FormData.tokens');
  tokenList = response.data;
};
