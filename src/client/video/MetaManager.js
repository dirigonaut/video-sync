const util          = require('util');
const EventEmitter  = require('events');

var ClientSocket    = require('../socket/ClientSocket.js');
var MpdMeta         = require('./meta/MpdMeta.js');
var Mp4Parser       = require('./meta/Mp4Parser.js');
var WebmParser      = require('./meta/WebmParser.js');

var clientSocket = new ClientSocket();

function MetaManager() {
  this.metaDataList   = null;
  this.activeMetaData = null;
}

util.inherits(MetaManager, EventEmitter);

MetaManager.prototype.requestMetaData = function(fileBuffer) {
  this.metaDataList = new Map();
  clientSocket.sendRequest('get-meta-files', fileBuffer.registerRequest(this.addMetaData));
};

MetaManager.prototype.addMetaData = function(header, binaryFile) {
  console.log('MetaManager.addMetaData');
  var util = null;

  if(header.type === 'webm') {
    util = new WebmParser();
  } else if(header.type === 'mp4') {
    util = new Mp4Parser();
  }

  this.metaDataList.set(header.type, new MpdMeta(binaryFile.toString(), util));

  if(this.activeMetaData === null) {
    this.setActiveMetaData(header.type);
  }
};

MetaManager.prototype.setActiveMetaData = function(metaKey) {
  this.activeMetaData = this.metaDataList.get(metaKey);
  this.emit('meta-data-loaded', header.type);
};

MetaManager.prototype.getActiveMetaData = function() {
  return this.activeMetaData;
};

module.exports = MetaManager;
