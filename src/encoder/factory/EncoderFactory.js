const Promise = require('bluebird');
const Path    = require('path');
const Crypto  = require('crypto');

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

EncoderFactory.prototype.createPlan = Promise.coroutine(function* (templateIds, inDir, outDir) {
  log.info('EncoderFactory.createPlan', arguments);
  var fileList = yield getAllFilesToEncode(inDir);
  var plan = { processes : [], statuses: [] };

  for(let id in templateIds) {
    if(config.getConfig().ffmpeg.templates[templateIds[id]]) {
      var template = config.getConfig().ffmpeg.templates[templateIds[id]];

      for(var i in fileList) {
        var file = fileList[i];
        for(var codec of Object.keys(template)) {
          commands = [];

          for(var entry of Object.entries(template[codec])) {
            var key = entry[0];
            var value = entry[1];
            var hash = getHash(plan.processes);

            switch (key) {
              case EncoderFactory.Enum.Types.VIDEO.toLowerCase():
                let videos = this.createMediaCommands(codec, EncoderFactory.Enum.Types.VIDEO.toLowerCase(),
                              value, file, inDir, outDir);

                commands = commands.concat(videos);
                for(let i in videos) {
                  plan.processes.push([hash, createFfmpegProcess.call(this, videos[i], hash)]);
                }
                break;
              case EncoderFactory.Enum.Types.AUDIO.toLowerCase():
                let audios = this.createMediaCommands(codec, EncoderFactory.Enum.Types.AUDIO.toLowerCase(),
                              value, file, inDir, outDir);

                commands = commands.concat(audios);
                for(let i in audios) {
                  plan.processes.push([hash, createFfmpegProcess.call(this, audios[i], hash)]);
                }
                break;
              case EncoderFactory.Enum.Types.SUBTITLE.toLowerCase():
                let tracks = yield getSubtitleTracks.call(this, file);
                let subtitles = this.createSubtitleCommands(codec, templateIds[id], tracks,
                                  file, inDir, outDir);

                for(let i in subtitles) {
                  plan.processes.push([hash, createFfmpegProcess.call(this, subtitles[i], hash)]);
                }
                break;
            }
          }

          var hash = getHash(plan.processes);
          var manifestProcess = createFfmpegProcess.call(this, this.createManifestCommand(codec, templateIds[id], commands, file, inDir, outDir), hash);
          plan.processes.push([hash, manifestProcess]);

          if(codec === EncoderFactory.Enum.Codecs.WEBM) {
            var hash = getHash(plan.processes);
            var mpdPath = manifestProcess.command[manifestProcess.command.length - 1];
            plan.processes.push([hash, createClusterProcess.call(this, mpdPath)]);
          }
        }
      }
    } else {
      throw new Error(`Error config.ffmpeg.template.${templateIds[id]} does not exist.`);
    }
  }

  return plan;
});

EncoderFactory.prototype.createMediaCommands = function(codec, type, templates, input, inDir, outDir) {
  log.info('EncoderFactory.createMediaCommands', arguments);
  var commands = [];

  for(var entry of Object.entries(templates)) {
    var command = this.factory.createCommand();
    command.setTemplate(entry[1]);
    command.setArgs(input, getOutputPath(codec, entry[0], input, inDir, outDir));
    commands.push(command);
  }

  return commands;
};

EncoderFactory.prototype.createSubtitleCommands = function(codec, id, tracks, input, inDir, outDir) {
  log.info('EncoderFactory.createSubtitleCommands', arguments);
  var subtitle = config.getConfig().ffmpeg.templates[id][codec].subtitle;
  var commands = [];

  var command = this.factory.createCommand();
  command.setTemplate(subtitle);
  command.setArgs(input, getOutputPath("vtt", codec, input, inDir, outDir));
  commands.push(command);

  return commands;
};

EncoderFactory.prototype.createManifestCommand = function(codec, id, commands, input, inDir, outDir) {
  log.info('EncoderFactory.createManifestCommand', arguments);
  var command = this.factory.createCommand();
  var manifest = config.getConfig().ffmpeg.templates[id][codec].manifest;

  command.setTemplate(manifest.base);

  if(codec === EncoderFactory.Enum.Codecs.WEBM) {
    command.setArgs.apply(command, getWebmManifestArgs(manifest, command, codec, commands,
      getOutputPath("mpd", codec, input, inDir, outDir)));
  } else {
    throw new Error(`Codec: ${codec} is not supported.`);
  }

  return command;
};

EncoderFactory.prototype.createFfprobeCommand = function(input) {
  log.info('EncoderFactory.createFfprobeCommand', arguments);
  var command = this.factory.createCommand();

  command.setTemplate(config.getConfig().ffmpeg.ffprobe);
  command.setArgs(input);

  return command;
};

module.exports = EncoderFactory;

EncoderFactory.Enum        = { };
EncoderFactory.Enum.Types  = { VIDEO: 'VIDEO', AUDIO: 'AUDIO', SUBTITLE: 'SUBTITLE', MANIFEST: 'MANIFEST' };
EncoderFactory.Enum.Codecs = { WEBM: 'webm' };

var getWebmManifestArgs = function(manifest, manCommand, codec, commands, output) {
  var maps = [];
  var aSet = [];
  var vSet = [];
  var inputs = [];

  var inputString = "";
  var mapString = "";
  for(let i = 0; i < commands.length; ++i) {
    var args = commands[i].getArgs();

    if(args.indexOf('-c:v') > 0) {
      vSet.push(i);
    } else if(args.indexOf('-c:a') > 0) {
      aSet.push(i);
    }

    inputString += inputString && inputString.length === 0 ? manifest.input : ` ${manifest.input}`;
    mapString += mapString && mapString.length === 0 ? manifest.map : ` ${manifest.map}`;
    inputs.push(commands[i].getOutput());
    maps.push(i);
  }

  manCommand.setTemplate(manCommand.format(0, inputString.trim()));
  manCommand.setTemplate(manCommand.format(inputs.length, mapString.trim()));

  var args = inputs.concat(maps);
  args.push([vSet.join(","), aSet.join(",")]);
  args.push(output);
  return args;
};

var getOutputPath = function(codec, id, input, inDir, outDir) {
  var subPath = input.substring(inDir.length + 1, input.length);
  var splitPath = subPath.split(/[/\\]+/);
  var splitType = splitPath.pop().split('.');

  var dirName = decodeURI(Path.basename(input, `.${splitType.pop()}`))
  return Path.join(outDir, Path.join.apply(null, splitPath), dirName.trim(),
      `${splitType.join('.')}_${id}.${codec}`);
};

var getAllFilesToEncode = Promise.coroutine(function* (dir) {
  return yield pathUtil.getAllPaths(dir, [], new RegExp(config.getConfig().ffmpeg.codecs), true);
});

var getSubtitleTracks = Promise.coroutine(function* (path) {
  var probe = createFfprobeProcess.call(this, this.createFfprobeCommand(path));
  var meta = yield probe.execute();
  var tracks = [];

  if(meta) {
    meta = JSON.parse(meta);

    if(meta.streams){
      var streams = meta.streams;

      for(var i in streams) {
        if(streams[i].codec_type === "subtitle") {
          tracks.push(i);
        }
      }
    }
  }

  return tracks;
});

var getHash = function(object) {
  while(true) {
    hash = Crypto.randomBytes(32).toString('hex');
    if(!object[hash]) {
      return hash;
    }
    continue;
  }
};

var createFfmpegProcess = function(command, id) {
  var ffmpeg = this.factory.createFfmpegProcess();
  ffmpeg.setCommand(command.getArgs());
  ffmpeg.setHash.call(ffmpeg, id);
  return ffmpeg
};

var createFfprobeProcess = function(command) {
  var ffprobe = this.factory.createFfprobeProcess();
  ffprobe.setCommand(command.getArgs());
  return ffprobe;
};

var createClusterProcess = function(mpdPath) {
  var webmMeta = this.factory.createWebmMetaProcess();
  webmMeta.setCommand(mpdPath);
  return webmMeta;
};
