var RequestFactory  = require('../utils/RequestFactory.js');
var ClientSocket    = require('../socket/ClientSocket.js');

var clientSocket = new ClientSocket();

var sessionList = [];
var activeSession = null;

var smtp = null;

function FormDataSingleton() {

};

FormDataSingleton.prototype.initialize = function() {
  clientSocket.sendRequest('db-read-smpts');
};

FormDataSingleton.prototype.getSessionList = function() {
  return smtp;
};

FormDataSingleton.prototype.getActiveSession = function() {
  return activeSession;
};

FormDataSingleton.prototype.setActiveSession = function(session) {
  activeSession = session;
};

FormDataSingleton.prototype.setupEvents = function() {
  clientSocket.clearEvent('db-smtps', dbSmtps);

  clientSocket.setEvent('db-smtps', dbSmtps);
}

module.exports = FormDataSingleton;

var dbSmtps = function(response){
  console.log('db-smtps');
  smtp = response;
  activeSession = smtp[0];
};
