const Events  = require('events');
const Util    = require('util');
const Promise = require('bluebird');
const Crypto  = require('crypto');

var webmMetaData, xmlUtil, mpdUtil, log;

function WebmMetaProcess() { }

WebmMetaProcess.prototype.initialize = function() {
  if(typeof WebmMetaProcess.prototype.protoInit === 'undefined') {
    WebmMetaProcess.prototype.protoInit = true;
    Object.setPrototypeOf(WebmMetaProcess.prototype, Events.prototype);
    webmMetaData    = this.factory.createWebmMetaData();
    xmlUtil         = this.factory.createXmlUtil();
    mpdUtil         = this.factory.createMpdUtil();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);
  }
};

WebmMetaProcess.prototype.setCommand = function(command) {
  this.command = command;
};

WebmMetaProcess.prototype.execute = Promise.coroutine(function* () {
  log.info(`WebmMetaProcess.execute`, this.command);
  var meta = yield webmMetaData.generateWebmMeta(this.command);
  var pid = Math.random().toString(8)

  if(!meta) {
    this.emit('exit', 1);
    throw new Error('meta data is not defined.');
  }

  this.emit('start', pid);

  var xmlMeta = xmlUtil.webmMetaToXml(meta);
  yield mpdUtil.addSegmentsToMpd(this.command, xmlMeta).then(function() {
    this.emit('exit', pid, 0);
  }.bind(this)).catch(function(err) {
    this.emit('exit', pid, 1);
  }.bind(this));
});

WebmMetaProcess.prototype.inspect = function() {
  return { "WebmMetaProcess": this.command };
};

module.exports = WebmMetaProcess;
