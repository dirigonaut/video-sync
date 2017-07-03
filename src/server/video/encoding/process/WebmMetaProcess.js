const Events  = require('events');
const Util    = require('util');
const Promise = require('bluebird');

var webmMetaData, log;

function WebmMetaProcess { }

WebmMetaProcess.prototype.initialize = function(force) {
  if(typeof WebmMetaProcess.prototype.protoInit === 'undefined') {
    WebmMetaProcess.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ENCODING);
  }

  if(force === undefined ? typeof WebmMetaProcess.prototype.stateInit === 'undefined' : force) {
    WebmMetaProcess.prototype.stateInit = true;
		Object.assign(this.prototype, Events.prototype);
    webmMetaData    = this.factory.createWebmMetaData();
  }
};

WebmMetaProcess.prototype.setCommand = function(command) {
  this.command = command;
};

WebmMetaProcess.prototype.execute = function() {
  var meta = yield webmMetaData.generateWebmMeta(path, saveMetaToMpd);

  if(meta) {
    log.debug('Save webm metadata', meta);
    var xmlUtil = new XmlUtil();
    var xmlMeta = xmlUtil.webmMetaToXml(meta);

    var mpdUtil = new MpdUtil();
    mpdUtil.addSegmentsToMpd(path, xmlMeta, function() {
      socket.emit('webm-meta-generated');
    });
  }
};

module.exports = WebmMetaProcess;
