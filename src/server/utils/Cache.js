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

Cache.prototype.get = function(requestData, callback) {
  log.debug('get-segment');
  var key = `${requestData.path}-${requestData.segment[0]}-${requestData.segment[1]}-${requestData.typeId}`;

  if(!cacheMap.contains(key)) {
    requestMap.set(key, [callback]);
    readFile(key, requestData);
  } else {
    if(cacheMap.get(key) !== undefined) {
      callback(getCacheData(key));
    } else {
      requestMap.get(key).push(callback);
    }
  }
};

module.exports = Cache;

function readFile(key, requestData) {
  var fileIO = new FileIO();

  var readConfig = fileIO.createStreamConfig(session.getMediaPath() + requestData.path, function(data) {
    var segment = new Object();
    segment.typeId = requestData.typeId;
    segment.data = data;
    handleCallbacks(key, segment);
  });

  var options = {"start": parseInt(requestData.segment[0]), "end": parseInt(requestData.segment[1])};
  readConfig.options = options;

  cacheMap.set(key, undefined);
  fileIO.read(readConfig);
}

function pruneCache() {
  var now = Date.now();

  for(var pair of heatMap) {
    var entry = pair[1];

    var temp = [];
    for(var i in entry) {
      //maybe parse float
      if(entry[i] - now < LIFE_TIME) {
        entry.shift();
      }
    }

    if(entry.length === 0) {
      cacheMap.remove(pair[0]);
    }
  }
}

function getCacheData(key) {
  var entry = heatMap.get(key);

  if(entry) {
    entry.push(Date.now());
  } else {
    entry = [Date.now()];
    heatMap.set(key, entry);
  }

  return cacheMap.get(key);
}

function handleCallbacks(key, segment) {
  for(var callback of requestMap.get(key)) {
    callback(segment);
  }

  requestMap.remove(key);
}
