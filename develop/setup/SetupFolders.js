const Promise   = require('bluebird');
const Path      = require('path');
const Fs        = Promise.promisifyAll(require('fs'));

const Config     = require('../../src/server/utils/Config.js');
const FileIO     = require('../../src/server/utils/FileIO.js');

const GENERIC_CONFIG_DIR  = Path.join(__dirname, "../../", "configs");
const CONFIG_NAME         = "config.yaml";
const REDIS_CONFIG        = "redis.conf";
const REDIS_CONFIG_OS     = `redis.${process.platform}.conf`;

var getConfig = function () {
  if(process.env.VIDEO_SYNC_CONFIG) {
    if(Path.isAbsolute(process.env.VIDEO_SYNC_CONFIG)) {
      configPath = process.env.VIDEO_SYNC_CONFIG;
      var config = Object.create(Config.prototype);

      return new Promise(Promise.coroutine(function*(resolve, reject) {
        try {
          yield config.load(configPath);
          resolve(config);
        } catch (e) {
          reject(e);
        }
      }));
    } else {
      throw new Error(
        `VIDEO_SYNC_CONFIG env var is expected to be an absolute path not: ${process.env.VIDEO_SYNC_CONFIG}`);
    }
  }
};

var fileIO = Object.create(FileIO.prototype);
getConfig().then(function(config) {
  setupAppDataDir.call(this, config.getConfig().dirs.configDir)
});

var setupAppDataDir = Promise.coroutine(function* (configDir) {
  yield ensureDirExists(configDir);
  yield ensureAssetExists(configDir, REDIS_CONFIG, `redis.${REDIS_CONFIG_OS}.conf`, "conf");
  yield ensureAssetExists(configDir, CONFIG_NAME, CONFIG_NAME, "yaml");
});

var ensureDirExists = Promise.coroutine(function* (dir, mask) {
  return Fs.mkdirAsync(dir, mask)
    .catch(function(err) {
      if (err.code !== 'EEXIST') {
        throw new Error(err);
      }
  });
});

var ensureAssetExists = Promise.coroutine(function* (dir, name, pattern, extType) {
  var fileExists;
  var files = yield fileIO.readDirAsync(dir, extType);

  if(files) {
    for(let i = 0; i < files.length; ++i) {
      if(files[i].includes(name)) {
        fileExists = true;
        break;
      }
    }
  }

  if(!fileExists) {
    var binaryData = yield Fs.readFileAsync(Path.join(GENERIC_CONFIG_DIR, pattern));
    fileExists = yield Fs.writeFileAsync(Path.join(dir, name), binaryData);
  }
});
