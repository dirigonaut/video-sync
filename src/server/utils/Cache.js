const EventEmitter  = require('events');

var FileIO      = require('../utils/FileIO');
var Session     = require('../administration/Session');
var LogManager  = require('../log/LogManager');

var log = LogManager.getLog(LogManager.LogEnum.UTILS);

var cacheMap = new Map();
var requestMap = new Map();

var interval = setInterval(function() {
  pruneCache();
}, 1000);

function Cache() {
}

Cache.prototype.get = function(requestData, callback) {
  log.debug('get-segment');

  if(!cacheMap.contains(requestData.path)) {
    requestMap.set(requestData.path, [callback]);
    cacheMap.set(requestData.path, undefined);

    var readConfig = FileIO.createStreamConfig(session.getMediaPath() + requestData.path, function(data) {
      var segment = new Object();
      segment.typeId = typeId;
      segment.data = data;

      socket.emit("segment-chunk", segment);
    });

    if(requestData.segment) {
      var options = {"start": parseInt(requestData.segment[0]), "end": parseInt(requestData.segment[1])};
      readConfig.options = options;
    } else {
      log.debug("No segment options passed in.");
    }

    readConfig.onFinish = function() {
      socket.emit("segment-end");
    };

    fileIO.read(readConfig);
  } else {
    if(cacheMap.get(requestData.path) !== undefined) {
      callback(cacheMap.get(requestData.path));
    } else {
      requestMap.get(requestData.path).push(callback);
    }
  }
};

module.exports = Cache;

function pruneCache() {

}
