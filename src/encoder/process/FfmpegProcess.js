const Promise = require('bluebird');
const Events  = require('events');
const Path    = require('path');
const Fs      = require('fs');

const Spawn = require('child_process').spawn;

const DUR_REG=/(Duration:\s)(\d{2,}:)+(\d{2,})(.\d{2,})/g;
const CUR_REG=/(time=)(\d{2,}:)+(\d{2,})(.\d{2,})/g;

var fileIO, config, log;

function FfmpegProcess() { }

FfmpegProcess.prototype.initialize = function() {
  if(typeof FfmpegProcess.prototype.protoInit === 'undefined') {
    FfmpegProcess.prototype.protoInit = true;
    Object.setPrototypeOf(FfmpegProcess.prototype, Events.prototype);
    fileIO          = this.factory.createFileIO();
    config          = this.factory.createConfig();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);
  }
};

FfmpegProcess.prototype.setCommand = function(command) {
  this.command = command;
};

FfmpegProcess.prototype.setHash = function(hash) {
  this.hash = hash;
};

FfmpegProcess.prototype.execute = Promise.coroutine(function* () {
  var ffmpegPath = config.getConfig() ? config.getConfig().external.ffmpeg : undefined;
  yield fileIO.ensureDirExistsAsync(Path.dirname(this.command[this.command.length - 1]));

  this.ffmpeg = Spawn(ffmpegPath ? ffmpegPath : "ffmpeg", this.command);
  log.info(`Spawned child pid: ${this.ffmpeg.pid}`, this.command);

  if(config.getConfig().log.logEncoding && this.hash) {
    var name = `${this.hash}.log`;
    var logPath = `${Path.join(config.getConfig().dirs.encodeLogDir, name)}`;
    this.stream = Fs.createWriteStream(logPath);
  }

  var stdBuff = '';
  var dur;
  this.ffmpeg.stderr.on('data', function(data) {
    stdBuff += data.toString('utf8');

    if(this.stream) {
      this.stream.write(data);
    }

    if(!dur || dur.length < 0) {
      dur = DUR_REG.exec(stdBuff);
      dur = dur && dur.length > 0 ? dur[0].split(/\s/) : undefined;
      dur = dur && dur.length > 1 ? dur[1] : undefined;
    }

    cur = CUR_REG.exec(data.toString('utf8'));
    this.emit('data',
      cur && cur.length > 0 ? cur[0] : null, dur);
  }.bind(this));

  var handleExit = function(data) {
    log.info(`Closed child pid: `, this.ffmpeg.pid);
    this.emit('exit', data);

    if(this.stream) {
      this.stream.end();
    }
  }.bind(this);

  this.ffmpeg.on('close', handleExit);

  this.ffmpeg.on('error', function(data) {
    if(this.stream) {
      this.stream.write(data);
    }

    this.emit('error', data.toString('utf8'));
  }.bind(this));

  this.emit('start');
});

FfmpegProcess.prototype.cancel = function() {
  try {
    this.ffmpeg.kill();
  } catch(e) {
    log.error(e);
  }
};

FfmpegProcess.prototype.inspect = function() {
  var args = this.command.slice();
  var adaptsIndex = args.indexOf('-adaptation_sets');
  if(adaptsIndex > -1) {
    args[adaptsIndex + 1] = `"${args[adaptsIndex + 1].trim()}"`;
  }

  return { "FfmpegProcess" : this.command ,
            "command": `ffmpeg ${args.join(" ")}`};
}

module.exports = FfmpegProcess;
