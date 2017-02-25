const EventEmitter  = require('events');

var FileIO      = require('../utils/FileIO');
var Session     = require('../administration/Session');
var LogManager  = require('../log/LogManager');

var log = LogManager.getLog(LogManager.LogEnum.UTILS);

var cacheMap   = new Map();
var heatMap    = new Map();

var requestMap = new Map();

var session    = new Session();

const LIFE_TIME = 6000;

var interval = setInterval(function() {
  pruneCache();
}, 1000);

function Cache() {
}

Cache.prototype.getSegment = function(requestData, callback) {
  var key = `${requestData.path}-${requestData.segment[0]}-${requestData.segment[1]}-${requestData.typeId}`;
  log.debug('get-segment', key);

  if(!cacheMap.has(key)) {
    requestMap.set(key, [callback]);
    readFile(key, requestData);
  } else {
    var segmentArray = cacheMap.get(key);
    if(segmentArray.length !== 0) {
      for(var i in segmentArray) {
        callback(segmentArray[i]);
      }
    } else {
      requestMap.get(key).push(callback);
    }
  }
};

module.exports = Cache;

function readFile(key, requestData) {
  log.debug('Cache.readFile');
  var fileIO = new FileIO();

  var readConfig = fileIO.createStreamConfig(session.getMediaPath() + requestData.path, function(data) {
    var segment = new Object();
    segment.typeId = requestData.typeId;
    segment.data = data;

    cacheMap.get(key).push(segment);
    heatMap.set(key, [Date.now()]);
    handleCallbacks(key, segment);
  });

  var options = {"start": parseInt(requestData.segment[0]), "end": parseInt(requestData.segment[1])};
  readConfig.options = options;

  readConfig.onFinish = function() {
    requestMap.delete(key);
  };

  cacheMap.set(key, []);
  fileIO.read(readConfig);
}

function pruneCache() {
  log.silly('Cache.pruneCache');
  var now = Date.now();

  for(var pair of heatMap) {
    var entry = pair[1];

    for(var i in entry) {
      if(parseInt(now) - parseInt(entry[i]) > LIFE_TIME) {
        log.debug("Removing entry: ", entry[i]);
        entry.shift();
      }
    }

    if(entry.length === 0) {
      log.debug("Cache deleting entry: ", pair[0]);
      cacheMap.delete(pair[0]);
      heatMap.delete(pair[0]);
    }
  }
}

function getCacheData(key) {
  log.debug('Cache.getCacheData', heatMap.get(key));
  var entry = heatMap.get(key);

  if(entry) {
    entry.push(Date.now());
  }

  return cacheMap.get(key);
}

function handleCallbacks(key, segment) {
  log.debug('Cache.handleCallbacks', key);
  var callbacks = requestMap.get(key);
  for(var i in callbacks) {
    callbacks[i](segment);
  }
}
