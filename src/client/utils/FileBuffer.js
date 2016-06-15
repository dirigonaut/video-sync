var log          = require('loglevel');
var ClientSocket = require('../socket/ClientSocket.js');

var clientSocket = new ClientSocket();

function FileBuffer() {
    log.setDefaultLevel(0);
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

  if(data instanceof Buffer) {
    buffer.data.push(data);
  } else {
    var buff = new Buffer(data);
    buffer.data.push(buff);
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
  clientSocket.clearEvent('file-register-response', fileRegisterResponse);
  clientSocket.clearEvent('file-segment', fileSegment);
  clientSocket.clearEvent('file-end', fileEnd);

  clientSocket.setEvent('file-register-response', fileRegisterResponse);
  clientSocket.setEvent('file-segment', fileSegment);
  clientSocket.setEvent('file-end', fileEnd);
}

module.exports = FileBuffer;

var fileRegisterResponse = function(response, callback){
  console.log('file-register-response');
  fileBuffer.registerResponse(response.requestId, response.header, callback);
};

var fileSegment = function(response){
  console.log('file-segment');
  fileBuffer.onData(response.bufferId, response.data);
};

var fileEnd = function(response){
  console.log('file-end');
  fileBuffer.onFinish(response.bufferId);
};
