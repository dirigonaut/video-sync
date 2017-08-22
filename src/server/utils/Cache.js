const Promise     = require('bluebird');
const Redis       = require('redis');
const Events      = require('events');

Promise.promisifyAll(Redis.RedisClient.prototype);

const EXPIRES     = 15000;
const READID      = '-readRequest';

var session, publisher, client, fileIO, schemaFactory, log;

function Cache() { }

Cache.prototype.initialize = function(force) {
  if(typeof Cache.prototype.protoInit === 'undefined') {
    Cache.prototype.protoInit = true;
    fileIO          = this.factory.createFileIO();
    schemaFactory   = this.factory.createSchemaFactory();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.VIDEO);
  }

  if(force === undefined ? typeof Cache.prototype.stateInit === 'undefined' : force) {
    Cache.prototype.stateInit = true;
    Object.setPrototypeOf(Cache.prototype, Events.prototype);
    var config      = this.factory.createConfig();

    session         = this.factory.createSession();
    publisher       = Redis.createClient(config.getConfig().redis);
    client          = Redis.createClient(config.getConfig().redis);

    client.on("message", function(channel, message) {
      log.debug('Subscribers onMessage ', channel);
      message = typeof message === 'string' ? JSON.parse(message) : message;

      if(channel.substring(channel.length - READID.length) === READID) {
        var key = channel.substring(0, channel.length - READID.length);
        readFile(key, message);
        client.unsubscribe(channel);
      } else {
        this.emit(channel, message);
      }
    }.bind(this));
  }
};

Cache.prototype.getSegment = Promise.coroutine(function* (requestData, callback) {
  var key = `${requestData.path}-${requestData.segment[0]}-${requestData.segment[1]}-${requestData.typeId}`;
  log.debug(`Cache.getSegment ${key}`);
  var lastIndex;
  var triggerCheck;
  var timeout;
  var indexes = [];

  var segmentHandler = Promise.coroutine(function* (index) {
    log.debug(`Cache.segmentHandler ${key}:${index}`, indexes);
    if(index !== undefined) {
      var segment;

      do {
        if(!indexes.includes(index)) {
          segment = yield getCacheData(`${key}:${index}`);
          ++index;
        } else if (index > lastIndex) {
          segment = undefined;
        } else {
          ++index;
          continue;
        }

        if(segment && !indexes.includes(segment.index)) {
          if(typeof segment.name !== 'undefined' && segment.name) {
            if(segment.data === null) {
              lastIndex = segment.index;
            }

            if(typeof segment.data !== 'undefined' && segment.data) {
              segment.data = new Buffer(new Uint8Array(segment.data.data));
            }

            callback(segment);
            indexes.push(segment.index);

            if(lastIndex) {
              if(lastIndex === indexes.length - 1) {
                log.debug(`Unsubscribing key: ${key} lastIndex: ${lastIndex}, indexes: ${indexes.length}`);
                if(!timeout) {
                  timeout = setTimeout(function() {
                    client.unsubscribe(key);
                  }, EXPIRES/4);
                }
                break;
              } else if(!triggerCheck) {
                triggerCheck = true;
                segmentHandler(0);
              }
            }
          }
        }
      } while(segment);
    }
  });

  this.on(key, segmentHandler);
  yield client.subscribeAsync(key);
  yield client.subscribeAsync(`${key}${READID}`);
  yield publisher.publishAsync(`${key}${READID}`, JSON.stringify(requestData));

  segmentHandler(0);
});

module.exports = Cache;

var readFile = Promise.coroutine(function* (key, requestData) {
  log.debug(`Cache.readFile ${key}`);
  var result = yield registerFileRead(key);
  if(result) {
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
  }
});

var setCacheData = Promise.coroutine(function* (key, index, data) {
  log.debug(`setCacheData for key: ${key}:${index}`);
  var json = JSON.stringify(data);
  yield publisher.setAsync(`${key}:${index}`, json, 'EX', EXPIRES);
  yield publisher.publishAsync(key, index);
});

var getCacheData = Promise.coroutine(function* (key) {
  log.debug(`getCacheData for key: ${key}`);
  var data = yield publisher.getAsync(key);

  if(data) {
    data = JSON.parse(data);
  }

  return data;
});

var registerFileRead = Promise.coroutine(function* (key) {
  var result = yield publisher.setAsync(`${key}`, 'registered', 'NX', 'EX', EXPIRES);
  return result === 'OK' ? true : false;
});
