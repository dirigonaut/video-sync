const Path    = require('path');

const REGEX = /d/;

var config, pathUtil, log;

function EncoderFactory() { }

EncoderFactory.prototype.initialize = function() {
  if(typeof EncoderFactory.prototype.protoInit === 'undefined') {
    EncoderFactory.prototype.protoInit = true;
		config    = this.factory.createConfig();
    pathUtil  = this.factory.createPathUtil();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.Enums.LOGS.ENCODING);
  }
};

EncoderFactory.prototype.createEncodingPlan = Promise.coroutine(function* (templateId, inDir, outDir) {
  var fileList = yield getAllFilesToEncode(inDir);
  var plan = {};
  var template = config.getConfig().ffmpeg.templates[templateId];

  if(template) {
    for(var i in fileList) {
      commands = {};
      processes = [];

      for(var codec in template.keys()) {
        for(var key in template.get(codec)) {
          var value = template.get(codec).get(key);

          switch (key): {
            case EncodeFactory.Enum.Types.VIDEO.lower():
              let videos = this.createMediaCommands(codec, EncodeFactory.Enum.Types.VIDEO.lower(),
                            value, inDir, outDir);

              commands.concat(videos);
              for(let i in videos) {
                processes.push(createFfmpegProcess.call(this, videos[i]));
              }
              break;
            case EncodeFactory.Enum.Types.AUDIO.lower():
              let audios = this.createMediaCommands(codec, EncodeFactory.Enum.Types.AUDIO.lower(),
                            value, inDir, outDir);

              commands.concat(audios);
              for(let i in audios) {
                processes.push(createFfmpegProcess.call(this, audios[i]));
              }
              break;
            case EncodeFactory.Enum.Types.SUBTITLE.lower():
              let subtitle = this.createSubtitleCommands(codec, value, getSubtitleTracks(fileList[i]),
                                fileList[i], outDir));

              processes.push(createFfmpegProcess.call(this, subtitle));
              break;
          }
        }

        processes.push(createFfmpegProcess.call(this, this.createManifestCommand(codec, templateId, commands, outDir)));
        processes.push(createClusterProcess.call(this, fileList[i]));
      }

      for(let i = 0; i < processes.length; ++i) {
        var newKey = Crypto.randomBytes(32).toString('hex');
        if(plan[newKey]) {
          --i; // If key collision, try again
          continue;
        } else {
          plan.set(newKey, processes[i]);
        }
      }
    }
  } else {
    throw new Error(`Error config.ffmpeg.template.${templateId} does not exist.`);
  }

  return plan;
});

EncoderFactory.prototype.createMediaCommands = function(codec, type, templates, input, outputDir) {
  var commands = [];

  for(var i in templates.keys()) {
    var command = this.factory.createCommand();
    command.setTemplate(templates.get(i));
    command.format(input, getOutputPath(codec, i, input, outputDir,
      `${getOutputPath(codec, input, outputDir)} ${getLoggingPath(i, input, String(type).lower())}`));

    commands.push(command);
  }

  return commands;
};

EncoderFactory.prototype.createSubtitleCommands = function(codec, id, tracks, input, outputDir) {
  var codecs = config.getConfig().ffmpeg.templates[id].codec.subtitles;
  var commands = [];

  for(var i in tracks) {
    var command = this.factory.createCommand();

    command.setTemplate(codecs[0]);
    command.format(input, tracks[i], getOutputPath(tracks[i], input, outputDir,
      `${getOutputPath(".vtt", input, outputDir)} ${getLoggingPath(id, input, EncodeFactory.Enum.Types.SUBTITLE.lower())}`));
    commands.push(command);
  }

  return commands;
};

EncoderFactory.prototype.createManifestCommand = function(codec, id, commands, outputDir) {
  var command = this.factory.createCommand();
  var manifest = config.getConfig().ffmppeg.templates[id].codec.manifest;

  command.setTemplate(manifest.base);
  command.format(getWebmManifestArgs(manifest, input, commands,
    `${getOutputPath(".mpd", input, outputDir)} ${getLoggingPath(id, input, EncodeFactory.Enum.Types.MANIFEST.lower())}`));

  return command;
};

EncoderFactory.prototype.createFfprobeCommand = function(input) {
  var command = this.factory.createCommand();

  command.setTemplate(config.getConfig().ffmpeg.ffprobe);
  command.format(input);

  return command;
};

module.exports = EncodeFactory;

EncodeFactory.Enum       = { };
EncodeFactory.Enum.Types = { VIDEO: 'VIDEO', AUDIO: 'AUDIO', SUBTITLE: 'SUBTITLE', MANIFEST: 'MANIFEST' };

var getWebmManifestArgs = function(manifest, codec, commands, output) {
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

    inputs.push(format.call(manifest.input, args['-i']));
    maps.push(format.call(manifest.map, i));
  }

  return [
    inputs.join(" "), maps.join(" "),
    vSet.join(","), aSet.join(","),
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
  var fileList = yield pathUtil.getAllPaths(dir, [], config.getConfig().ffmppeg.codecs);
});

var getSubtitleTracks = Promise.coroutine(function* (path) {
  var probe = createFfprobeProcess(encoderFactory.createFfprobeCommand(path));
  var meta = yield probe.execute();
  var tracks;

  if(meta && meta.streams){
    var streams = meta.streams;

    for(var i in streams) {
      if(streams[i].codec_type === "subtitle") {
        tracks.push(streams[i]);
      }
    }
  }

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

var getLoggingPath = function(id, input, type) {
  if(config.getConfig().log.logEncoding) {
    var name = `${Path.basename(input)}-${id}-${type}.log`
    return `> ${Path.join(config.getConfig().dirs.encodeLogDir, name)}`;
  }
};
