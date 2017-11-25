const Promise = require('bluebird');
const Events  = require('events');

const Spawn = require('child_process').spawn;

var redisProcess, log;

function RedisServer() { };

RedisServer.prototype.initialize = function() {
  if(typeof RedisServer.prototype.protoInit === 'undefined') {
    RedisServer.prototype.protoInit = true;
    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.GENERAL);
  }
};

RedisServer.prototype.start = function(bin, config) {
  log.info(`RedisServer.start ${bin}`, config);
  if(!redisProcess) {
    redisProcess = Spawn(bin, [ config ]);
    redisProcess.stdout.on('error', log.error);

    return new Promise(function(resolve, reject) {
      redisProcess.stdout.on('data', function(data) {
        data = data.toString('utf8');

        if(data.includes('Server started')) {
          data = data.replace(/[-./'/`_|\\]*/g, '');
          data = data.replace(/\s{2,}/g, '');
        }

        if(data.includes('ready to accept connections')) {
          resolve();
        }

        log.info(data);
      });

      redisProcess.once('exit', function(data) {
        log.info(data.toString('utf8'));
        reject(data.toString('utf8'));
      });
    });
  } else {
    return Promise.reject(`Redis is already running as process ${redisProcess.pid}`);
  }
};

module.exports = RedisServer;
