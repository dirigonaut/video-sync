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

    for(let i in quality) {
      var vCommand = this.createVideoCommand(quality[i], fileList[i], outDir);
      var aCommand = this.createAudioCommand(quality[i], fileList[i], outDir);

      commands.push(vCommand);
      commands.push(aCommand);

      processes.push(createFfmpegProcess.call(this, vCommand));
      processes.push(createFfmpegProcess.call(this, aCommand));
    }

    processes.push(createFfmpegProcess.call(this, this.createManifestCommand(quality, commands, outDir)));

    if(codec === this.Enum.Types.WEBM) {
      processes.push(createClusterProcess.call(this, fileList[i]));
    }

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
  command.setTemplate(config.getConfig().templates[quality].video.webm);
  command.format(input, getOutputPath(codec, quality, input, outputDir));
  return command;
};

EncoderFactory.prototype.createAudioCommand = function(quality, input, outputDir) {
  var command = this.factory.createCommand();
  command.setTemplate(config.getConfig().templates[quality].audio.webm);
  command.format(input, getOutputPath(codec, quality, input, outputDir));
  return command;
};

EncoderFactory.prototype.createSubtitleCommands = function(quality, tracks, input, outputDir) {
  var commands = [];

  for(var i in tracks) {
    var command = this.factory.createCommand();
    command.setTemplate(config.getConfig().templates[quality].subtitle.webm);
    command.format(input, tracks[i], getOutputPath(tracks[i], input, outputDir));
    commands.push(command);
  }

  return commands;
};

EncoderFactory.prototype.createManifestCommand = function(quality, commands, outputDir) {
  var command = this.factory.createCommand();
  command.setTemplate(config.getConfig().templates[quality].manifest.webm);
  command.format(`get${codec.charAt(0).toUpperCase() + codec.slice(1)}ManifestArgs`(input, commands, getOutputPath(codec, codec, input, outputDir)));
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
EncodeFactory.Enum.Codec    = { WEBM: 'webm', MP4: 'mp4' };

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
