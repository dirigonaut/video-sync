const Promise  = require('bluebird');

var sessionList, smtpList, socket, log;

function FormData() { }

FormData.prototype.initialize = function(force) {
  if(typeof FormData.prototype.protoInit === 'undefined') {
    FormData.prototype.protoInit = true;
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
  yield socket.requestAsync('db-read-smpts', 'db-smtps');
  yield socket.requestAsync('db-read-sessions', 'db-sessions');
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
  socket.setEvent('db-smtps', dbSmtps);
  socket.setEvent('db-sessions', dbSessions);
  socket.setEvent('db-refresh', dbRefresh);
}

function removeSocketEvents() {
  log.debug("FormData.removeSocketEvents");
  socket.removeEvent('db-smtps', dbSmtps);
  socket.removeEvent('db-sessions', dbSessions);
  socket.removeEvent('db-refresh', dbRefresh);
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
  socket.request('db-read-smpts');
  socket.request('db-read-sessions');
}
