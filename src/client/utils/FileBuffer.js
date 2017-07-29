const Promise  = require('bluebird');
const Events    = require('events');

const TIMEOUT  = 6000;

var fileRequests, buffers, trigger, socket, schemaFactory, eventKeys, log;

function FileBuffer() { }

FileBuffer.prototype.initialize = function(force) {
  if(typeof FileBuffer.prototype.protoInit === 'undefined') {
    FileBuffer.prototype.protoInit = true;
    var logManager  = this.factory.createClientLogManager();
		log             = logManager.getLog(logManager.LogEnum.GENERAL);

    eventKeys       = this.factory.createKeys();
    schemaFactory   = this.factory.createSchemaFactory();
  }

  if(force === undefined ? typeof FileBuffer.prototype.stateInit === 'undefined' : force) {
    FileBuffer.prototype.stateInit = true;
    socket          = this.factory.createClientSocket();

    removeTriggerEvents();
    removeSocketEvents();
    setSocketEvents();

    fileRequests    = new Map();
    buffers         = new Map();
    trigger         = new Events();
  }
};

FileBuffer.prototype.requestFilesAsync = function() {
  log.info('FileBuffer.registerRequest');
  var requestInfo       = { };
  requestInfo.requestId = "r" + genId();
  requestInfo.buffCount = 0;
  requestInfo.files     = [];

  fileRequests.set(requestInfo.requestId, requestInfo);

  var request = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STRING, [requestInfo.requestId]);
  socket.request(eventKeys.FILES, request);

  return new Promise(function(resolve, reject) {
    trigger.once(`${requestInfo.requestId}`, resolve);
    setTimeout(function(err) {
      fileRequests.delete(requestInfo.requestId);
      trigger.removeListener(requestInfo.requestId, resolve);
      reject(err);
    },TIMEOUT, `Request for Key: ${requestInfo.requestId}, timed out.`);
  });
};

module.exports = FileBuffer;

function genId() {
  return Math.random().toString(36).slice(-8);
}

function registerResponse(requestId, header, serverCallback) {
  log.info('FileBuffer.registerResponse');
  var fileRequest = fileRequests.get(requestId);
  fileRequest.buffCount++;

  var buffer = { };
  buffer.id = "b" + genId();
  buffer.requestId = requestId;
  buffer.info = header;
  buffer.data = [];

  buffers.set(buffer.id, buffer);

  serverCallback(buffer.id);
}

function onData(bufferId, data) {
  log.info('FileBuffer.onData');
  var buffer = buffers.get(bufferId);

  if(buffer && data) {
    if(data instanceof Buffer) {
      buffer.data.push(data);
    } else {
      var buff = new Buffer(data);
      buffer.data.push(buff);
    }
  }
}

function onFinish(bufferId) {
  log.info('FileBuffer.onFinish');
  var buffer = buffers.get(bufferId);
  var fileRequest = fileRequests.get(buffer.requestId);

  if(buffer && fileRequest) {
    fileRequest.files.push([buffer.info, Buffer.concat(buffer.data)]);
    buffers.delete(bufferId);
    fileRequest.buffCount--;

    if(fileRequest.buffCount <= 0) {
      log.info("Deleting request: " + fileRequest.requestId + " from map.");
      delete fileRequests[fileRequest.requestId];
      trigger.emit(fileRequest.requestId, fileRequest.files);
    }
  }
}

function setSocketEvents() {
  socket.setEvent(eventKeys.FILEREGISTER, function(response, callback){
    log.debug(eventKeys.FILEREGISTER);
    registerResponse(response.id, response.data, callback);
  });

  socket.setEvent(eventKeys.FILESEGMENT, function(response){
    log.debug(eventKeys.FILESEGMENT);
    onData(response.id, response.data);
  });

  socket.setEvent(eventKeys.FILEEND, function(response){
    log.debug(eventKeys.FILEEND);
    onFinish(response.id);
  });
}

function removeSocketEvents() {
  socket.removeEvent(eventKeys.FILEREGISTER);
  socket.removeEvent(eventKeys.FILESEGMENT);
  socket.removeEvent(eventKeys.FILEEND);
}

function removeTriggerEvents() {
  if(trigger) {
    var allEvents = trigger.eventNames();
    for(var i = 0; i < allEvents.length; ++i) {
      trigger.removeAllListeners(allEvents[i]);
    }
  }
}
