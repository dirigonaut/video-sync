const Promise     = require('bluebird');
const Redis         = require('redis');

var subCallbacks, publisher, client;

function Cache() { }

Cache.prototype.initialize = function() {
  if(typeof Cache.prototype.lazyInit === 'undefined') {
    subCallbacks    = {};
    publisher       = Redis.createClient(this.config.getConfig().redis);
    client          = Redis.createClient(this.config.getConfig().redis);

    client.on("message", function(channel, message) {
      this.log.debug('Subscribers onMessage ', channel);
      message = JSON.parse(message);

      var callbacks = subCallbacks.get(channel);
      if(callbacks) {
        this.log.debug(`Subscribers returning data for key ${channel} and index ${message.index}`);
        if(message.data !== null) {
          message.data = new Buffer(new Uint8Array(message.data.data));
        }

        for(var i in callbacks) {
          callbacks[i](message);
        }
      }
    });
    Cache.prototype.lazyInit = true;
  }
};

Cache.prototype.getSegment = Promise.coroutine(function* (requestData, callback) {
  var key = `${requestData.path}-${requestData.segment[0]}-${requestData.segment[1]}-${requestData.typeId}`;
  this.log.debug('Cache.getSegment', key);

  var handleCachedData = function(err, segment) {
    if(err === null) {
      if(segment !== undefined && segment !== null) {
        this.log.info('Cache has data', key);
        if(segment.name !== undefined && segment.name !== null) {
          if(segment.data !== null) {
            segment.data = new Buffer(new Uint8Array(segment.data.data));
          }

          callback(segment);

          if(segment.data !== null && segment.index !== null) {
            getCacheData.call(this, `${key}:${segment.index + 1}`, handleCachedData);
          }
        }
      } else if(subCallbacks.get(key) !== null && subCallbacks.get(key) !== undefined) {
        subscribeToRead(key, callback);
      } else {
        this.log.info('Cache has no data', key);
        readFile.call(this, key, requestData);
        subscribeToRead(key, callback);
      }
    }
  }.bind(this);

  getCacheData.call(this, `${key}:0`, handleCachedData);
});

module.exports = Cache;

var readFile = Promise.coroutine(function* (key, requestData) {
  this.log.debug(`Cache.readFile ${key}`);
  var fileIO = yield this.factory.createFileIO();

  var basePath = yield this.session.getMediaPath();
  var readConfig = fileIO.createStreamConfig(basePath + requestData.path, function onData(data, index) {
    this.log.debug('Cache on data', key);
    var segment = {};
    segment.typeId = requestData.typeId;
    segment.name = key;
    segment.data = data;
    segment.index = index;

    var handleResponse = function(err, result) {
      if(err) {
        this.log.error(`Could not insert segment into cache for key: ${key}:${index}`, err);
      } else {
        this.log.debug(`Publishing segment for key: ${key}:${index}`);
        publisher.publish(key, JSON.stringify(segment));
      }
    };

    setCacheData.call(this, `${key}:${index}`, segment, handleResponse);
  }.bind(this));

  var options = {"start": parseInt(requestData.segment[0]), "end": parseInt(requestData.segment[1])};
  readConfig.options = options;

  readConfig.onFinish = function onFinish(index) {
    this.log.debug('Cache finished read: ', key);
    var segment = {};
    segment.typeId = requestData.typeId;
    segment.name = key;
    segment.data = null;
    segment.index = index;

    var handleResponse = function(err, result) {
      if(err) {
        this.log.error(`Could not insert segment into cache for key: ${key}:${index}`, err);
      } else {
        this.log.debug(`Publishing segment for key: ${key}:${index}`);

        publisher.publish(key, JSON.stringify(segment));
      }
    };

    setCacheData.call(this, `${key}:${index}`, segment, handleResponse);
  }.bind(this);

  fileIO.read(readConfig);
});

var setCacheData = function(key, data, callback) {
  this.log.debug('setCacheData for key: ', key);
  var response = function(err, result) {
    if(err) {
      callback(err);
    } else {
      callback(null, data ? data.index : null);
    }
  };

  publisher.set(key, JSON.stringify(data), 'EX', 24, response);
};

var getCacheData = function(key, callback) {
  this.log.debug('getCacheData for key: ', key);
  publisher.get(key, function(err, reply) {
    callback(err, JSON.parse(reply));
  });
};

var subscribeToRead = function(key, callback) {
  this.log.debug('subscribeToRead for key: ', key);
  var callbacks = subCallbacks.get(key);

  if(callbacks !== undefined && callbacks !== null) {
    callbacks.splice(callbacks.length - 1, 0, callback)
  } else {
    callbacks = [ callback, createUnsubscribeListener.call(this, key)];
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
        this.log.debug(`Unsubscribing key: ${key} lastIndex: ${lastIndex}, countIndex: ${countIndex}`);
        subCallbacks.delete(key);
        client.unsubscribe(key);
      }

      ++countIndex;
    }
  }.bind(this);

  return unsubscribe;
};
