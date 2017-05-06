var RequestFactory  = require('../utils/RequestFactory.js');
var ClientSocket    = require('../socket/ClientSocket.js');
var ClientLog       = require('../log/ClientLogManager');

var log             = ClientLog.getLog();
var clientSocket    = new ClientSocket();

var sessionList = [];
var smtpList = [];

function FormDataSingleton() {

};

FormDataSingleton.prototype.setupEvents = function() {
  log.debug("FormDataSingleton.setupEvents");
  clientSocket.clearEvent('db-smtps', dbSmtps);
  clientSocket.clearEvent('db-sessions', dbSessions);
  clientSocket.clearEvent('db-refresh', dbRefresh);

  clientSocket.setEvent('db-smtps', dbSmtps);
  clientSocket.setEvent('db-sessions', dbSessions);
  clientSocket.setEvent('db-refresh', dbRefresh);
};

FormDataSingleton.prototype.initializeData = function() {
  log.debug("FormDataSingleton.initializeData");
  clientSocket.sendRequest('db-read-smpts');
  clientSocket.sendRequest('db-read-sessions');
};

FormDataSingleton.prototype.getSessionList = function() {
  return sessionList;
};

FormDataSingleton.prototype.getSmtpList = function() {
  return smtpList;
};

module.exports = FormDataSingleton;

var dbSmtps = function(response){
  console.log('db-smtps');
  smtpList = response;
};

var dbSessions = function(response) {
  console.log('db-sessions');
  sessionList = response;
};

var dbRefresh = function() {
  log.debug("FormDataSingleton._dbRefresh");
  clientSocket.sendRequest('db-read-smpts');
  clientSocket.sendRequest('db-read-sessions');
}
