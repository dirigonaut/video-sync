var log = require('loglevel');

var fileRequests = null;
var buffers = null;

function FileBuffer() {
  if(fileRequests == null) {
    log.setDefaultLevel(0);
    log.info('FileBuffer');

    fileRequests = new Map();
    buffers = new Map();
  }
}

FileBuffer.prototype.reinitialize = function() {
  log.info('FileBuffer.reinitialize');
  fileRequests = new Map();
  buffers = new Map();
};

FileBuffer.prototype.registerRequest = function(callback) {
  log.info('FileBuffer.registerRequest');
  var requestInfo       = new Object();
  requestInfo.onFinish  = callback;
  requestInfo.requestId = "r" + this._genId();
  requestInfo.buffCount = 0;

  fileRequests.set(requestInfo.requestId, requestInfo);

  return requestInfo.requestId;
};

FileBuffer.prototype.registerResponse = function(requestId, header, callback) {
  log.info('FileBuffer.registerResponse');
  var fileRequest = fileRequests.get(requestId);
  fileRequest.buffCount++;

  var buffer = new Object();
  buffer.id = "b" + this._genId();
  buffer.requestId = requestId;
  buffer.info = header;
  buffer.data = [];

  buffers.set(buffer.id, buffer);

  callback(buffer.id);
};

FileBuffer.prototype.onData = function(bufferId, data) {
  log.info('FileBuffer.onData');
  var buffer = buffers.get(bufferId);

  if(data instanceof Buffer) {
    buffer.data.push(data);
  } else {
    var buff = new Buffer(data);
    buffer.data.push(buff);
  }
};

FileBuffer.prototype.onFinish = function(bufferId) {
  log.info('FileBuffer.onFinish');
  var buffer = buffers.get(bufferId);
  var fileRequest = fileRequests.get(buffer.requestId);

  fileRequest.onFinish(buffer.info, Buffer.concat(buffer.data));
  buffers.delete(bufferId);
  fileRequest.buffCount--;

  if(fileRequest.buffCount <= 0) {
    log.info("Deleting request: " + fileRequest.requestId + " from map.");
    fileRequests.delete(fileRequest.requestId);
  }
};

FileBuffer.prototype._genId = function() {
    return Math.random().toString(36).slice(-8);
};

module.exports = FileBuffer;
