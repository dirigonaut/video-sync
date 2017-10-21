const Promise = require('bluebird');
const Redis   = require('redis');

Promise.promisifyAll(Redis.RedisClient.prototype);

const METRICSINTERVAL = 1000;

var client, redisSocket, autoSyncInterval, eventKeys, log;

function Media() { }

Media.prototype.initialize = function() {
  if(typeof Media.prototype.protoInit === 'undefined') {
    Media.prototype.protoInit = true;
    redisSocket     = this.factory.createRedisSocket();
    eventKeys       = this.factory.createKeys();

    var config      = this.factory.createConfig();
    client          = Redis.createClient(config.getConfig().redis);

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ADMINISTRATION);
  }
};

Media.prototype.getMediaStarted = function() {
  log.silly("Media.getMediaStarted");
  return getMediaData.call(this, Media.Enum.Keys.STARTED);
};

Media.prototype.setMediaStarted = Promise.coroutine(function* (started) {
  log.silly("Media.setMediaStarted");
  var basePath = yield this.getMediaPath();
  if(typeof basePath !== 'undefined' && basePath) {
    autoSyncInterval = createMetricInterval.call(this);
    return setMediaData(Media.Enum.Keys.STARTED, started);
  }

  return new Promise.reject(new Error("Media is not defined."));
});

Media.prototype.getMediaPath = function() {
  log.silly("Media.getMediaPath");
  return getMediaData.call(this, Media.Enum.Keys.PATH);
};

Media.prototype.setMediaPath = Promise.coroutine(function* (path) {
  log.info("Media.setMediaPath");
  return setMediaData(Media.Enum.Keys.PATH, path)
  .then(function(results) {
    if(autoSyncInterval) {
      clearInterval(autoSyncInterval);
    }

    return this.setMediaStarted(false);
  }.bind(this));
});

Media.prototype.getMediaRule = function() {
  log.silly("Media.getMediaSyncRule");
  return getMediaData.call(this, Media.Enum.Keys.RULE);
};

Media.prototype.setMediaRule = function(active, range) {
  log.silly("Media.setMediaSyncRule");
  return setMediaData(Media.Enum.Keys.RULE, { 'active': active, 'range': range });
};

Media.prototype.getPlayerMetrics = function() {
  log.silly("Media.getPlayerMetrics");
  return getMediaData(Media.Enum.Keys.METRICS);
};

Media.prototype.setPlayerMetrics = function(metrics) {
  log.silly("Media.setPlayerMetrics");
  return setMediaData(Media.Enum.Keys.METRICS, metrics);
};

module.exports = Media;

Media.Enum = {};
Media.Enum.Keys = { PATH: "media-path", STARTED: "media-started", RULE: "media-rule", METRICS: "media-metrics"};

var setMediaData = function(key, data) {
  log.silly('setMediaData for key: ', key);
  return client.setAsync(key, JSON.stringify(data));
};

var getMediaData = function(key) {
  log.silly('getMediaData for key:', key);
  return client.getAsync(key).then(function(results) {
    return JSON.parse(results);
  });
};

var createMetricInterval = function() {
  return setInterval(Promise.coroutine(function* () {
    var metrics = yield this.getPlayerMetrics();
    yield redisSocket.broadcast.apply(this, [eventKeys.PLAYERINFO, metrics]);
  }.bind(this)), METRICSINTERVAL);
}
