var FileIO        = require('../utils/FileIO');
var LogManager    = require('../log/LogManager');
var PlayerManager = require('../player/PlayerManager');
var Player        = require('../player/Player');

var basePath      = null;
var cacheMap      = new Map();
var heatMap       = new Map();

var requestMap    = new Map();

var playerManager = new PlayerManager();

var log           = LogManager.getLog(LogManager.LogEnum.UTILS);

const LIFE_TIME   = 6000;
const INTERVAL    = 1000;

var pruneInterval = setInterval(function pruneInterval() {
  if(playerManager.getSyncedPlayersState() === Player.State.PLAY) {
    pruneCache();
  }
}, INTERVAL);

function Cache() {
}

Cache.prototype.getSegment = function(player, requestData, callback) {
  var key = `${requestData.path}-${requestData.segment[0]}-${requestData.segment[1]}-${requestData.typeId}`;
  log.debug('Cache.getSegment', key);

  if(!cacheMap.has(key)) {
    log.silly('Cache has no data', key);
    if(player.sync !== Player.Sync.DESYNCED) {
      requestMap.set(key, [callback]);
    }
    readFile(key, requestData, player.sync !== Player.Sync.DESYNCED);
  } else {
    var segmentArray = cacheMap.get(key);
    if(segmentArray.length !== 0) {
      log.silly('Cache has data', key);
      log.debug('Cache has data', segmentArray.length);
      for(var i in segmentArray) {
        callback(segmentArray[i]);
      }
    } else {
      log.silly('Cache currently reading data', key);
      requestMap.get(key).push(callback);
    }
  }
};

Cache.prototype.setPath = function(path) {
  basePath = path;
};

Cache.prototype.flush = function() {
  var cacheMap      = new Map();
  var heatMap       = new Map();
  var requestMap    = new Map();
};

module.exports = Cache;

function readFile(key, requestData, cache) {
  log.debug('Cache.readFile');
  var fileIO = new FileIO();

  var readConfig = fileIO.createStreamConfig(basePath + requestData.path, function onData(data) {
    log.silly('Cache on data', key);
    var segment = new Object();
    segment.typeId = requestData.typeId;
    segment.name = key;
    segment.data = data;
    segment.index = cacheMap.get(key) !== null && cacheMap.get(key) !== undefined ? cacheMap.get(key).length : 0;

    if(cache) {
      log.silly('Cache adding Entry: ', {"key": key, "size": segment.data.length});
      cacheMap.get(key).push(segment);
      heatMap.set(key, [0]);
    }

    handleCallbacks(key, segment);
  });

  var options = {"start": parseInt(requestData.segment[0]), "end": parseInt(requestData.segment[1])};
  readConfig.options = options;

  readConfig.onFinish = function onFinish() {
    log.silly('Cache finished read: ', key);

    if(cacheMap.get(key) !== null || cacheMap.get(key) !== undefined) {
      var segment = new Object();
      segment.typeId = requestData.typeId;
      segment.name = key;
      segment.data = null;
      segment.index = cacheMap.get(key).length;
      cacheMap.get(key).push(segment);
      log.debug('Cache has data', cacheMap.get(key).length);

      handleCallbacks(key, segment);

      if(cache) {
        requestMap.delete(key);
      }
    }
  };

  if(cache) {
    log.silly('Cache adding entry: ', key);
    cacheMap.set(key, []);
  }

  fileIO.read(readConfig);
}

function pruneCache() {
  log.silly('Cache.pruneCache');
  for(var pair of heatMap) {
    var entry = pair[1];

    for(var i in entry) {
      if(parseInt(entry[i]) > LIFE_TIME) {
        log.debug(`Removing entry: ${entry[i]} from: `, entry);
        entry.shift();
      } else {
        entry[i] += INTERVAL;
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
    entry.push([0]);
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
