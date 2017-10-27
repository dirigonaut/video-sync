const Promise  = require('bluebird');
const Events   = require('events');

var formEvents, formList, socket, eventKeys, log;

function FormData() { }

FormData.prototype.initialize = function(init) {
  if(typeof FormData.prototype.protoInit === 'undefined' && typeof init !== 'undefined' ? init : false) {
    FormData.prototype.protoInit = true;
    Object.setPrototypeOf(FormData.prototype, Events.prototype);

    socket    = this.factory.createClientSocket();
    eventKeys = this.factory.createKeys();

    var logManager  = this.factory.createClientLogManager();
		log             = logManager.getLog(logManager.Enums.LOGS.GENERAL);

    formList    = new Map();
    formEvents  = new Map();
    formEvents.set(FormData.Enum.Forms.TOKENS, function(data) { setData.call(this, FormData.Enum.Forms.TOKENS, data) }.bind(this));

    setSocketEvents(formEvents);
  }
};

FormData.prototype.getFormData = function(key) {
  return formList.get(key);
};

FormData.prototype.clean = function() {
  removeSocketEvents(formEvents);
};

module.exports = FormData;

FormData.Enum = {};
FormData.Enum.Forms = { TOKENS: 'tokens' };

function setSocketEvents(events) {
  log.debug("FormData.setSocketEvents");
  socket.setEvent(eventKeys.TOKENS, events.get(FormData.Enum.Forms.TOKENS));
}

function removeSocketEvents(events) {
  if(events) {
    socket.removeEvent(eventKeys.TOKENS, events.get(FormData.Enum.Forms.TOKENS));
  }
}

function setData(key, response) {
  log.debug(`FormData.setData ${key}`, response);
  formList.set(key, response.data);
  this.emit(key, response.data);
}
