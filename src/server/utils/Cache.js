const Promise     = require('bluebird');
const Redis       = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

var subCallbacks, session, publisher, client, fileIO, schemaFactory, log;

function Cache() { }

Cache.prototype.initialize = function(force) {
  if(typeof Cache.prototype.protoInit === 'undefined') {
    Cache.prototype.protoInit = true;
    fileIO          = this.factory.createFileIO();
    schemaFactory   = this.factory.createSchemaFactory();
    var config      = this.factory.createConfig();
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.VIDEO);
  }

  if(force === undefined ? typeof Cache.prototype.stateInit === 'undefined' : force) {
    Cache.prototype.stateInit = true;
    subCallbacks    = new Map();

    session         = this.factory.createSession();
    publisher       = Redis.createClient(config.getConfig().redis);
    client          = Redis.createClient(config.getConfig().redis);

    client.on("message", function(channel, message) {
      log.debug('Subscribers onMessage ', channel);
      message = JSON.parse(message);

      var callbacks = subCallbacks.get(channel);
      if(callbacks) {
        log.debug(`Subscribers returning data for key ${channel} and index ${message.index}`);
        if(typeof message.data !== 'undefined' && message.data) {
          message.data = new Buffer(new Uint8Array(message.data.data));
        }

        for(var i in callbacks) {
          callbacks[i](message);
        }
      }
    });
  }
};

Cache.prototype.getSegment = Promise.coroutine(function* (requestData, callback) {
  var key = `${requestData.path}-${requestData.segment[0]}-${requestData.segment[1]}-${requestData.typeId}`;
  log.debug(`Cache.getSegment ${key}`);
  var segment = yield getCacheData(`${key}:0`);

  if(segment) {
    log.info(`Cache has data ${key}`);
    if(typeof segment.name !== 'undefined' && segment.name) {
      while(segment) {
        if(typeof segment.data !== 'undefined' && segment.data) {
          segment.data = new Buffer(new Uint8Array(segment.data.data));
        }

        callback(segment);
        segment = yield getCacheData(`${key}:${segment.index + 1}`);
      }

      if(subCallbacks.get(key)) {
        subscribeToRead(key, callback);
      }
    }
  } else {
    log.info('Cache has no data', key);
    subscribeToRead(key, callback);
    readFile(key, requestData);
  }
});

module.exports = Cache;

var readFile = Promise.coroutine(function* (key, requestData) {
  log.debug(`Cache.readFile ${key}`);
  var basePath = yield session.getMediaPath();

  if(basePath && basePath.length > 0) {
    var readConfig = fileIO.createStreamConfig(basePath + requestData.path, Promise.coroutine(function* (data, index) {
      log.debug(`Cache on data for key: ${key} of size: ${data ? data.length : null}`);
      var args = [requestData.typeId, key, data, index];
      var segment = schemaFactory.createPopulatedSchema(schemaFactory.Enum.VIDEORESPONSE, args);

      yield setCacheData(segment.name, segment.index, segment);
    }));

    var options = {"start": parseInt(requestData.segment[0]), "end": parseInt(requestData.segment[1])};
    readConfig.options = options;

    readConfig.onFinish = Promise.coroutine(function* (index) {
      log.debug('Cache finished read: ', key);
      var args = [requestData.typeId, key, null, index];
      var segment = schemaFactory.createPopulatedSchema(schemaFactory.Enum.VIDEORESPONSE, args);

      yield setCacheData(segment.name, segment.index, segment);
    });

    fileIO.read(readConfig);
  }
});

var setCacheData = Promise.coroutine(function* (key, index, data) {
  log.debug(`setCacheData for key: ${key}`);
  var json = JSON.stringify(data);
  yield publisher.setAsync(`${key}:${index}`, json, 'EX', 30);
  yield publisher.publishAsync(key, json);
});

var getCacheData = Promise.coroutine(function* (key) {
  log.debug('getCacheData for key: ', key);
  var data = yield publisher.getAsync(key);

  if(data) {
    data = JSON.parse(data);
  }

  return data;
});

var subscribeToRead = function(key, callback) {
  log.debug('subscribeToRead for key: ', key);
  var callbacks = subCallbacks.get(key);

  if(callbacks) {
    callbacks.splice(callbacks.length - 1, 0, callback);
  } else {
    callbacks = [callback, createUnsubscribeListener(key)];
    client.subscribe(key);
  }

  subCallbacks.set(key, callbacks);
};

var createUnsubscribeListener = function(key) {
  var lastIndex;
  var countIndex = 0;

  var unsubscribe = function(message) {
    if(message) {
      if(!message.data) {
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
