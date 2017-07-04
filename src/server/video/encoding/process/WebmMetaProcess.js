const Events  = require('events');
const Util    = require('util');
const Promise = require('bluebird');

var webmMetaData, xmlUtil, mpdUtil, log;

function WebmMetaProcess() { }

WebmMetaProcess.prototype.initialize = function(force) {
  if(typeof WebmMetaProcess.prototype.protoInit === 'undefined') {
    WebmMetaProcess.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ENCODING);
  }

  if(force === undefined ? typeof WebmMetaProcess.prototype.stateInit === 'undefined' : force) {
    WebmMetaProcess.prototype.stateInit = true;
		Object.setPrototypeOf(WebmMetaProcess.prototype, Events.prototype);
    webmMetaData    = this.factory.createWebmMetaData();
    xmlUtil         = this.factory.createXmlUtil();
    mpdUtil         = this.factory.createMpdUtil();
  }
};

WebmMetaProcess.prototype.setCommand = function(command) {
  this.command = command;
};

WebmMetaProcess.prototype.execute = Promise.coroutine(function* () {
  var meta = yield webmMetaData.generateWebmMeta(this.command);

  if(!meta) {
    throw new Error('meta data is not defined.');
  }

  var xmlMeta = xmlUtil.webmMetaToXml(meta);
  yield mpdUtil.addSegmentsToMpd(this.command, xmlMeta);
});

module.exports = WebmMetaProcess;
