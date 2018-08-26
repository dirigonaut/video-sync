const Path    = require('path');

const WEBM = { INPUT : '-f webm_dash_manifest -i {}', SET: "id={},streams={}", MAP: "-map {}" }
const REGEX = /d/;

var config, pathUtil;

function EncoderFactory() { }

EncoderFactory.prototype.initialize = function() {
  if(typeof EncoderFactory.prototype.protoInit === 'undefined') {
    EncoderFactory.prototype.protoInit = true;
		config    = this.factory.createConfig();
    pathUtil  = this.factory.createPathUtil();
  }
};

EncoderFactory.prototype.createEncodingPlan = Promise.coroutine(function* (quality, inDir, outDir) {
  var fileList = yield getAllFilesToEncode(inDir);

  var plan = {};
  for(var i in fileList) {
    commands = [];
    processes = [];

    var vCommand = this.createVideoCommand(quality, fileList[i], outDir);
    var aCommand = this.createAudioCommand(quality, fileList[i], outDir);

    commands.push(vCommand);
    commands.push(aCommand);

    processes.push(createFfmpegProcess.call(this, vCommand));
    processes.push(createFfmpegProcess.call(this, aCommand));
    processes.push(createFfmpegProcess.call(this, this.createManifestCommand(quality, commands, outDir)));
    processes.push(createClusterProcess.call(this, fileList[i]));

    var subtitles = this.createSubtitleCommands(quality, getSubtitleTracks(fileList[i]), fileList[i], outDir);

    for(let i in subtitles) {
      processes.push(createFfmpegProcess.call(this, subtitles[i]));
    }

    for(let i = 0; i < processes.length; ++i) {
      var newKey = Crypto.randomBytes(24).toString('hex');
      if(plan[newKey]) {
        --i;
        continue;
      } else {
        plan.set(newKey, processes[i]);
      }
    }
  }

  return plan;
});

EncoderFactory.prototype.createVideoCommand = function(quality, input, outputDir) {
  var command = this.factory.createCommand();
  var codecs = config.getConfig().templates[quality].video;

  if(codecs && codecs[0])
    command.setTemplate(codecs[0]);
    command.format(input, getOutputPath(codecs[0], quality, input,
      getLoggingPath(quality, input, EncodeFactory.Enum.Types.VIDEO.lower())));
  }

  return command;
};

EncoderFactory.prototype.createAudioCommand = function(quality, input, outputDir) {
  var command = this.factory.createCommand();
  var codecs = config.getConfig().templates[quality].audio;

  if(codecs && codecs[0])
    command.setTemplate(codecs[0]);
    command.format(input, getOutputPath(codecs[0], quality, input,
      getLoggingPath(quality, input, EncodeFactory.Enum.Types.AUDIO.lower())));
  }

  return command;
};

EncoderFactory.prototype.createSubtitleCommands = function(tracks, quality, input, outputDir) {
  var codecs = config.getConfig().templates[quality].subtitles;
  var commands = [];

  for(var i in tracks) {
    var command = this.factory.createCommand();

    if(codecs && codecs[0])
      command.setTemplate(codecs[0]);
      command.format(input, tracks[i], getOutputPath(tracks[i], input,
        getLoggingPath(quality, input, EncodeFactory.Enum.Types.SUBTITLE.lower())));
      }

    commands.push(command);
  }

  return commands;
};

EncoderFactory.prototype.createManifestCommand = function(quality, commands, outputDir) {
  var command = this.factory.createCommand();
  var codecs = config.getConfig().templates[quality].manifest;

  if(codecs && codecs[0])
    command.setTemplate(codecs[0]);
    command.format(getWebmManifestArgs(input, commands, getOutputPath(codecs[0], input,
      getLoggingPath(quality, input, EncodeFactory.Enum.Types.MANIFEST.lower())));
  }
  
  return command;
};

EncoderFactory.prototype.createFfprobeCommand = function(input) {
  var command = this.factory.createCommand();
  command.setTemplate(' -show_streams {}');
  command.format(input);
  return command;
};

module.exports = EncodeFactory;

EncodeFactory.Enum          = { };
EncodeFactory.Enum.Types    = { VIDEO: 'VIDEO', AUDIO: 'AUDIO', SUBTITLE: 'SUBTITLE', MANIFEST: 'MANIFEST' };

var getWebmManifestArgs = function(codec, commands, output) {
  var maps = [];
  var aSet = [];
  var vSet = [];
  var inputs = [];

  for(let i = 0; i < commands.length; ++i) {
    var args = commands[i].getArgs();

    if(args['-c:v']) {
      vSet.push(i);
    } else if(args['-c:a']) {
      aSet.push(i);
    }

    inputs.push(format.call(WEBM.INPUT, args['-i']));
    maps.push(format.call(WEBM.MAP, i));
  }

  return [
    inputs.join(" "), maps.join(" "),
    `${format.call(WEBM.SET, [0, vSet.join(",")])} ${format.call(WEBM.SET, [1, aSet.join(",")])}`,
    path.join(output, codec, '.mpd')];
};

var format = function() {
  var i = 0, args = arguments;
  return this.replace(/{}/g, function () {
    return typeof args[i] != 'undefined' ? args[i++] : '{}';
  });
};

var getOutputPath = function(codec, id, input, outputDir) {
  var splitPath = input.split(/[/\\]+/);
  var splitType = splitPath[splitPath.length - 1].split('.');
  splitType.pop();

  return Path.join(outputDir, `${splitType.join('.')}_${id}.${codec}`);
};

var getAllFilesToEncode = Promise.coroutine(function* (dir) {
  var fileList = yield pathUtil.getAllPaths(dir, [], REGEX);
});

var getSubtitleTracks = Promise.coroutine(function* (path) {
  var probe = createFfprobeProcess(encoderFactory.createFfprobeCommand(fileList[i]));
  var info = yield probe.execute();
  var tracks;

  //TODO parse out tracks

  return tracks;
});

var createFfmpegProcess = function(command) {
  var ffmpeg = this.factory.createFfmpegProcess();
  return ffmpeg.setCommand(command.getArgs());
};

var createFfprobeProcess = function(command) {
  var ffprobe = this.factory.createFfprobeProcess();
  return ffprobe.setCommand(command.getArgs());
};

var createClusterProcess = function(command) {
  var webmMeta = this.factory.createWebmMetaProcess();
  return webmMeta.setCommand(command);
};

var getLoggingPath = function(quality, input, type) {
  if(config.getConfig().log.logEncoding) {
    var name = `${Path.basename(input)}-${quality}-${type}.log`
    return `> ${Path.join(config.getConfig().dirs.encodeLogDir, name)}`;
  }
}
