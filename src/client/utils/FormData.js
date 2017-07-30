const Promise  = require('bluebird');

var sessionList, smtpList, socket, eventKeys, log;

function FormData() { }

FormData.prototype.initialize = function(force) {
  if(typeof FormData.prototype.protoInit === 'undefined') {
    FormData.prototype.protoInit = true;
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createClientLogManager();
		log             = logManager.getLog(logManager.LogEnum.GENERAL);
  }

  if(force === undefined ? typeof FormData.prototype.stateInit === 'undefined' : force) {
    FormData.prototype.stateInit = true;
    socket      = this.factory.createClientSocket();
    sessionList = [];
    smtpList    = [];

    removeSocketEvents();
    setSocketEvents();
  }
};

FormData.prototype.requestFormData = Promise.coroutine(function* () {
  log.debug("FormData.initializeData");
  yield socket.requestAsync(eventKeys.READSMTP, eventKeys.SMTP);
  yield socket.requestAsync(eventKeys.READSESSIONS, eventKeys.SESSION);
});

FormData.prototype.getSessionList = function() {
  return sessionList;
};

FormData.prototype.getSmtpList = function() {
  return smtpList;
};

module.exports = FormData;

function setSocketEvents() {
  log.debug("FormData.setSocketEvents");
  socket.setEvent(eventKeys.SMTP, dbSmtps);
  socket.setEvent(eventKeys.SESSION, dbSessions);
  socket.setEvent(eventKeys.REFRESH, dbRefresh);
}

function removeSocketEvents() {
  socket.removeEvent(eventKeys.SMTP, dbSmtps);
  socket.removeEvent(eventKeys.SESSION, dbSessions);
  socket.removeEvent(eventKeys.REFRESH, dbRefresh);
}

function dbSmtps(response){
  log.debug('FormData.dbSmtps');
  smtpList = response.data;
};

function dbSessions(response) {
  log.debug('FormData.dbSessions');
  sessionList = response.data;
};

function dbRefresh() {
  log.debug("FormData.dbRefresh");
  socket.request(eventKeys.READSMTP);
  socket.request(eventKeys.READSESSIONS);
}
