const TEMPLATES = {
  WEBM_VIDEO_TEMPLATE:    `-y -i "arg" -c:v libvpx-vp9 -s arg -keyint_min 150 -g 150 -b:v 0 -crf 42 -threads 8 -speed 2 -tile-columns 6 -frame-parallel 1 -an -f webm -dash 1 "arg"`,
  WEBM_AUDIO_TEMPLATE:    `-y -i "arg" -vn -c:a libopus -b:a arg -f webm -dash 1 "arg"`,
  WEBM_SUBTITLE_TEMPLATE: ``,
  WEBM_MANIFEST_TEMPLATE: `-y arg -c copy -f webm_dash_manifest -adaptation_sets "id=0,streams=arg id=1,streams=arg" "arg"`,

  MP4_VIDEO_TEMPLATE:     `-y -i "arg" -f 24 -an -c:v libx264 -profile:v main -preset slow -x264opts keyint=24:min-keyint=24:no-scenecut -vf scale=-1:arg -f mp4 -movflags frag_keyframe+empty_moov "arg"`,
  MP4_AUDIO_TEMPLATE:     `-y -i "arg" -vn -c:a libmp3lame -b:a arg "arg"`,
  MP4_SUBTITLE_TEMPLATE:  ``,
  MP4_MANIFEST_TEMPLATE:  `-dash 2000 -frag 2000 -rap -profile on-demand -bs-switching no -out arg "arg" "arg"`
};

const Snippets = { MANIFEST : '-f webm_dash_manifest', SETSAUDIO : 'id=1,streams=', SETSVIDEO: "id=0,streams=", MAP: "-map" };
const REGEX = /-[A-Za-z:_-]*\s"[A-Za-z0-9=,\s]*"|-[A-Za-z:_-]*\s[^-][0-9A-Za-z-_"/\\.]*|-[A-Za-z:_-]*/g;

function EncodeFactory() { }

EncodeFactory.prototype.getTemplate = function(codec, type) {
  return TEMPLATES[`${codec.toUpperCase()}_${type}_TEMPLATE`];
};

EncodeFactory.prototype.setKeyValue = function(key, newValue, str) {
  var regex = new RegExp(`-${key}\\s"[A-Za-z0-9=,\\s]*"|-${key}\\s[^-][0-9A-Za-z-_"/\\.]*`, 'g');
  var result = regex.exec(str);
  return str.substring(0, result.index)  + `-${key} ${newValue}` + str.substring(regex.lastIndex, str.length);
};

EncodeFactory.prototype.setOutput = function(path, str) {
  var regex = REGEX;
  var lastIndex, lastValue;

  for(var itter = regex.exec(str); itter; itter = regex.exec(str)) {
    lastIndex = regex.lastIndex;
    lastValue = itter[0];
  }

  return str.substring(0, lastIndex) + ` ${path}`;
};

EncodeFactory.prototype.getOutput = function(str) {
  var regex = REGEX;
  var lastIndex, lastValue;

  for(var itter = regex.exec(str); itter; itter = regex.exec(str)) {
    lastIndex = regex.lastIndex;
    lastValue = itter[0];
  }

  return str.substring(lastIndex, str.length);
};

EncodeFactory.prototype.getNameFromPath = function(path) {
  var splitPath = path.split(/[//\\]+/);
  var splitType = splitPath[splitPath.length - 1].split('.');
  return splitType[0];
};

EncodeFactory.prototype.createEncodings = function(input, output, commands, codec, encoder) {
  var maps = "copy ";
  var aSet = "";
  var vSet = "";
  var inputs = "";
  var results = [];
  var index = 0;

  for(let i = 0; i < commands.length; ++i) {
    let object = {};
    object.input = commands[i].input;
    object.encoder = encoder;
    results.push(object);

    if(commands[i].type === this.TypeEnum.VIDEO) {
      vSet = `${vSet.length > 0 ? vSet : Snippets.SETSVIDEO}${vSet.length > 0 ? "," + index : index}`;
      inputs = `${inputs} ${Snippets.MANIFEST.trim()} -i ${this.getOutput(object.input).trim()}`
      maps = `${maps.trim()} ${Snippets.MAP.trim()} ${i}`

      ++index;
    } else if(commands[i].type === this.TypeEnum.AUDIO) {
      aSet = `${aSet.length > 0 ? aSet : Snippets.SETSAUDIO}${aSet.length > 0 ? "," + index : index}`;
      inputs = `${inputs} ${Snippets.MANIFEST.trim()} -i ${this.getOutput(object.input).trim()}`
      maps = `${maps.trim()} ${Snippets.MAP.trim()} ${i}`

      ++index;
    }
  }

  var template = this.getTemplate(codec, this.TypeEnum.MANIFEST);
  template = this.setKeyValue('y', `${inputs.trim()}`, template);
  template = this.setKeyValue('c', maps, template);
  template = this.setKeyValue('adaptation_sets', `"${vSet} ${aSet}"`, template);
  template = this.setOutput(`${output}${this.getNameFromPath(input)}.mpd`, template);

  var object = {};
  object.input = template;
  object.encoder = encoder;
  results.push(object);

  return results;
};

EncodeFactory.prototype.TypeEnum  = { VIDEO : 'VIDEO', AUDIO : 'AUDIO', MANIFEST: 'MANIFEST' };
EncodeFactory.prototype.CodecEnum = { WEBM : 'webm', MP4 : 'mp4' };
EncodeFactory.prototype.EncoderEnum = { FFMPEG : 'ffmpeg', MP4BOX : 'mp4box' };

module.exports = EncodeFactory;
