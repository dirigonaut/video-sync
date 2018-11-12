const Promise  = require("bluebird");
const Events   = require("events");

const TIMEOUT  = 6000;

var fileRequests, buffers, trigger, socket, schemaFactory, eventKeys, log;

function FileBuffer() { }

FileBuffer.prototype.initialize = function(init) {
  if(typeof FileBuffer.prototype.protoInit === "undefined" || typeof init !== "undefined" ? init : false) {
    FileBuffer.prototype.protoInit = true;
    eventKeys       = this.factory.createKeys();
    schemaFactory   = this.factory.createSchemaFactory();
    socket          = this.factory.createClientSocket();
    fileRequests    = new Map();
    buffers         = new Map();

    trigger = new Events();
    setSocketEvents();

    var logManager  = this.factory.createClientLogManager();
		log             = logManager.getLog(logManager.Enums.LOGS.GENERAL);
  }
};

FileBuffer.prototype.requestFilesAsync = function(key) {
  log.info("FileBuffer.registerRequest");
  var requestInfo       = { };
  requestInfo.requestId = "r" + genId();
  requestInfo.buffCount = 0;
  requestInfo.files     = [];

  fileRequests.set(requestInfo.requestId, requestInfo);

  var request = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.STRING, [requestInfo.requestId]);
  socket.request(key, request);

  return new Promise(function(resolve, reject) {
    var rejectId = setTimeout(function(err) {
      log.debug(`FileBuffer rejecting download ${requestInfo.requestId}`);
      delete fileRequests[requestInfo.requestId];
      trigger.removeListener(requestInfo.requestId, resolve);
      reject(err);
    }, TIMEOUT, `Request for Key: ${requestInfo.requestId}, timed out.`);
    trigger.once(`${requestInfo.requestId}`, function(data) {
      log.debug(`FileBuffer finished downloading ${requestInfo.requestId}`);
      clearTimeout(rejectId);
      resolve(data);
    });
  });
};

FileBuffer.prototype.clean = function() {
  removeSocketEvents();
};

module.exports = FileBuffer;

function genId() {
  return Math.random().toString(36).slice(-8);
}

function registerResponse(requestId, header, serverCallback) {
  log.info("FileBuffer._registerResponse");
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
  log.info("FileBuffer._onData");
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
  log.info("FileBuffer._onFinish");
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
    log.debug(eventKeys.FILEREGISTER, response.id);
    registerResponse(response.id, response.data, callback);
  });

  socket.setEvent(eventKeys.FILESEGMENT, function(response){
    log.debug(eventKeys.FILESEGMENT, response.id);
    onData(response.id, response.data);
  });

  socket.setEvent(eventKeys.FILEEND, function(response){
    log.debug(eventKeys.FILEEND, response.id);
    onFinish(response.id);
  });

  socket.setEvent(eventKeys.NOFILES, function(response){
    log.debug(eventKeys.NOFILES, response.id);
    trigger.emit(response.id);
  }.bind(this));
}

function removeSocketEvents() {
  socket.removeEvent(eventKeys.FILEREGISTER);
  socket.removeEvent(eventKeys.FILESEGMENT);
  socket.removeEvent(eventKeys.FILEEND);
  socket.removeEvent(eventKeys.NOFILES);
}
