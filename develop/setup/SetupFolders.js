const Promise   = require('bluebird');
const Path      = require('path');
const Fs        = Promise.promisifyAll(require('fs'));

const GENERIC_CONFIG_DIR  = Path.join(__dirname, "../../", "configs");
const CONFIG_NAME         = "config.json";
const REDIS_CONFIG        = "redis.conf";
const REDIS_CONFIG_OS     = `redis.${process.platform}.conf`;

/*
  configPath: path/to/config/dir/
*/
var args = process.argv.slice(2);
yield setupAppDataDir.apply(this, args);

var setupAppDataDir = Promise.coroutine(function* (configDir) {
  yield ensureDirExists(configDir);
  yield ensureAssetExists(configDir, REDIS_CONFIG, `redis.${}.conf`, "conf");
  yield ensureAssetExists(configDir, CONFIG_NAME, CONFIG_NAME, "json");
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
