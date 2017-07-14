var ClientSocket = require('../socket/ClientSocket.js');
var ClientLog    = require('../log/ClientLogManager');

//var clientSocket = new ClientSocket();
//var log = ClientLog.getLog();

function FileBuffer() {
  log.info('FileBuffer');

  this.fileRequests = new Map();
  this.buffers = new Map();
}

FileBuffer.prototype.reinitialize = function() {
  log.info('FileBuffer.reinitialize');
  this.fileRequests = new Map();
  this.buffers = new Map();
};

FileBuffer.prototype.registerRequest = function(callback) {
  log.info('FileBuffer.registerRequest');
  var requestInfo       = new Object();
  requestInfo.onFinish  = callback;
  requestInfo.requestId = "r" + this._genId();
  requestInfo.buffCount = 0;

  this.fileRequests.set(requestInfo.requestId, requestInfo);

  return requestInfo.requestId;
};

FileBuffer.prototype.registerResponse = function(requestId, header, callback) {
  log.info('FileBuffer.registerResponse');
  var fileRequest = this.fileRequests.get(requestId);
  fileRequest.buffCount++;

  var buffer = new Object();
  buffer.id = "b" + this._genId();
  buffer.requestId = requestId;
  buffer.info = header;
  buffer.data = [];

  this.buffers.set(buffer.id, buffer);

  callback(buffer.id);
};

FileBuffer.prototype.onData = function(bufferId, data) {
  log.info('FileBuffer.onData');
  var buffer = this.buffers.get(bufferId);

  if(data) {
    if(data instanceof Buffer) {
      buffer.data.push(data);
    } else {
      var buff = new Buffer(data);
      buffer.data.push(buff);
    }
  }
};

FileBuffer.prototype.onFinish = function(bufferId) {
  log.info('FileBuffer.onFinish');
  var buffer = this.buffers.get(bufferId);
  var fileRequest = this.fileRequests.get(buffer.requestId);

  fileRequest.onFinish(buffer.info, Buffer.concat(buffer.data));
  this.buffers.delete(bufferId);
  fileRequest.buffCount--;

  if(fileRequest.buffCount <= 0) {
    log.info("Deleting request: " + fileRequest.requestId + " from map.");
    this.fileRequests.delete(fileRequest.requestId);
  }
};

FileBuffer.prototype._genId = function() {
    return Math.random().toString(36).slice(-8);
};

FileBuffer.prototype.setupEvents = function() {
  clientSocket.clearEvent('file-register-response');
  clientSocket.clearEvent('file-segment');
  clientSocket.clearEvent('file-end');

  setSocketEvents(this);
}

module.exports = FileBuffer;

var setSocketEvents = function(fileBuffer) {
  clientSocket.setEvent('file-register-response', function(response, callback){
    console.log('file-register-response');
    fileBuffer.registerResponse(response.id, response.data, callback);
  });

  clientSocket.setEvent('file-segment', function(response){
    console.log('file-segment');
    fileBuffer.onData(response.id, response.data);
  });

  clientSocket.setEvent('file-end', function(response){
    console.log('file-end');
    fileBuffer.onFinish(response.id);
  });
}
