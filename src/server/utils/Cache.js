const Promise     = require('bluebird');
const Redis       = require('redis');
const Events      = require('events');

Promise.promisifyAll(Redis.RedisClient.prototype);

const EXPIRES     = 15000;
const READID      = '-readRequest';

var media, publisher, client, fileIO, fileUtils, schemaFactory, log;

function Cache() { }

Cache.prototype.initialize = function() {
  if(typeof Cache.prototype.protoInit === 'undefined') {
    Cache.prototype.protoInit = true;
    Object.setPrototypeOf(Cache.prototype, Events.prototype);

    var config      = this.factory.createConfig();

    fileIO          = this.factory.createFileIO();
    fileUtils       = this.factory.createFileSystemUtils();
    schemaFactory   = this.factory.createSchemaFactory();

    media           = this.factory.createMedia();
    publisher       = Redis.createClient(config.getConfig().redisInfo);
    client          = Redis.createClient(config.getConfig().redisInfo);

    setSubscriber.call(this);

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.VIDEO);
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
        } else {
          segment = undefined;
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
                if(!timeout) {
                  timeout = setTimeout(function() {
                    this.removeListener(key, segmentHandler);
                    client.unsubscribe(key);
                  }.bind(this), EXPIRES/4);
                }
                break;
              } else if(!triggerCheck) {
                triggerCheck = true;
                segmentHandler(0);
              }
            }
          }
        }
      } while(indexes.includes(index) || segment);
    }
  }.bind(this));

  this.on(key, segmentHandler);
  yield client.subscribeAsync(key);
  yield client.subscribeAsync(`${key}${READID}`);
  yield publisher.publishAsync(`${key}${READID}`, JSON.stringify(requestData));

  segmentHandler(0);
});

module.exports = Cache;

var setSubscriber = function() {
  client.on('message', function(channel, message) {
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
};

var readFile = Promise.coroutine(function* (key, requestData) {
  log.debug(`Cache.readFile ${key}`);
  var result = yield registerFileRead(key);
  if(result) {
    var basePath = yield media.getMediaPath();

    if(basePath && basePath.length > 0) {
      var onData = Promise.coroutine(function* (data, index) {
        log.debug(`Cache on data for key: ${key} of size: ${data ? data.length : null}`);
        var args = [requestData.typeId, key, data, index];
        var segment = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.VIDEORESPONSE, args);

        yield setCacheData(segment.name, segment.index, segment);
      });

      var options = {"start": parseInt(requestData.segment[0]), "end": parseInt(requestData.segment[1])};

      var onFinish = Promise.coroutine(function* (index) {
        log.debug('Cache finished read: ', key);
        var args = [requestData.typeId, key, null, index];
        var segment = schemaFactory.createPopulatedSchema(schemaFactory.Enums.SCHEMAS.VIDEORESPONSE, args);

        yield setCacheData(segment.name, segment.index, segment);
      });

      fileIO.read(`${fileUtils.ensureEOL(basePath)}${requestData.path}`, options, onData, onFinish);
    }
  }
});

var setCacheData = Promise.coroutine(function* (key, index, data) {
  log.silly(`setCacheData for key: ${key}:${index}`);
  var json = JSON.stringify(data);
  yield publisher.setAsync(`${key}:${index}`, json, 'EX', EXPIRES);
  yield publisher.publishAsync(key, index);
});

var getCacheData = Promise.coroutine(function* (key) {
  log.silly(`getCacheData for key: ${key}`);
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
