var Redis         = require('redis');

var FileIO        = require('../utils/FileIO');
var LogManager    = require('../log/LogManager');

var log           = LogManager.getLog(LogManager.LogEnum.UTILS);
var basePath, subCallbacks, publisher, client;

function lazyInit() {
  subCallbacks    = new Map();
  publisher       = Redis.createClient();
  client          = Redis.createClient();

  client.on("message", function(channel, message) {
    log.debug('Subscribers onMessage ', channel);
    message = JSON.parse(message);

    var callbacks = subCallbacks.get(channel);
    if(callbacks !== undefined && callbacks !== null) {
      log.debug(`Subscribers returning data for key ${channel} and index ${message.index}`);
      if(message.data !== null) {
        message.data = new Buffer(new Uint8Array(message.data.data));
      }

      for(var i in callbacks) {
        callbacks[i](message);
      }
    }
  });
}

class Cache {
  constructor() {
    if(typeof Cache.prototype.lazyInit === 'undefined') {
      lazyInit();
      Cache.prototype.lazyInit = true;
    }
  }
}

Cache.prototype.getSegment = function(requestData, callback) {
  var key = `${requestData.path}-${requestData.segment[0]}-${requestData.segment[1]}-${requestData.typeId}`;
  log.debug('Cache.getSegment', key);

  var handleCachedData = function(err, segment) {
    if(err === null) {
      if(segment !== undefined && segment !== null) {
        log.info('Cache has data', key);
        if(segment.name !== undefined && segment.name !== null) {
          if(segment.data !== null) {
            segment.data = new Buffer(new Uint8Array(segment.data.data));
          }

          callback(segment);

          if(segment.data !== null && segment.index !== null) {
            getCacheData(`${key}:${segment.index + 1}`, handleCachedData);
          }
        }
      } else if(subCallbacks.get(key) !== null && subCallbacks.get(key) !== undefined) {
        subscribeToRead(key, callback);
      } else {
        log.info('Cache has no data', key);
        readFile(key, requestData);
        subscribeToRead(key, callback);
      }
    }
  };

  getCacheData(`${key}:0`, handleCachedData);
};

Cache.prototype.setPath = function(path) {
  basePath = path;
};

module.exports = Cache;

function readFile(key, requestData) {
  log.debug(`Cache.readFile ${key}`);
  var fileIO = new FileIO();

  var readConfig = fileIO.createStreamConfig(basePath + requestData.path, function onData(data, index) {
    log.debug('Cache on data', key);
    var segment = new Object();
    segment.typeId = requestData.typeId;
    segment.name = key;
    segment.data = data;
    segment.index = index;

    var handleResponse = function(err, result) {
      if(err) {
        log.error(`Could not insert segment into cache for key: ${key}:${index}`, err);
      } else {
        log.debug(`Publishing segment for key: ${key}:${index}`);
        publisher.publish(key, JSON.stringify(segment));
      }
    };

    setCacheData(`${key}:${index}`, segment, handleResponse);
  });

  var options = {"start": parseInt(requestData.segment[0]), "end": parseInt(requestData.segment[1])};
  readConfig.options = options;

  readConfig.onFinish = function onFinish(index) {
    log.debug('Cache finished read: ', key);
    var segment = new Object();
    segment.typeId = requestData.typeId;
    segment.name = key;
    segment.data = null;
    segment.index = index;

    var handleResponse = function(err, result) {
      if(err) {
        log.error(`Could not insert segment into cache for key: ${key}:${index}`, err);
      } else {
        log.debug(`Publishing segment for key: ${key}:${index}`);

        publisher.publish(key, JSON.stringify(segment));
      }
    };

    setCacheData(`${key}:${index}`, segment, handleResponse);
  };

  fileIO.read(readConfig);
}

var setCacheData = function(key, data, callback) {
  log.debug('setCacheData for key: ', key);
  var response = function(err, result) {
    if(err) {
      callback(err);
    } else {
      callback(null, data !== undefined && data !== null ? data.index : null);
    }
  };

  publisher.set(key, JSON.stringify(data), 'EX', 24, response);
};

var getCacheData = function(key, callback) {
  log.debug('getCacheData for key: ', key);
  publisher.get(key, function(err, reply) {
    callback(err, JSON.parse(reply));
  });
};

var subscribeToRead = function(key, callback) {
  log.debug('subscribeToRead for key: ', key);
  var callbacks = subCallbacks.get(key);

  if(callbacks !== undefined && callbacks !== null) {
    callbacks.splice(callbacks.length - 1, 0, callback)
  } else {
    callbacks = [ callback, createUnsubscribeListener(key)];
    client.subscribe(key);
  }

  subCallbacks.set(key, callbacks);
};

var createUnsubscribeListener = function(key) {
  var lastIndex;
  var countIndex = 0;

  var unsubscribe = function(message) {
    if(message !== null && message !== undefined) {
      if(message.data === null) {
        lastIndex = message.index;
      }

      if(lastIndex && lastIndex === countIndex) {
        log.debug(`Unsubscribing key: ${key} lastIndex: ${lastIndex}, countIndex: ${countIndex}`);
        subCallbacks.delete(key);
        client.unsubscribe(key);
      }

      ++countIndex;
    }
  };

  return unsubscribe;
};
