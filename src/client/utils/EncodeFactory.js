const TEMPLATES = {
  WEBM_VIDEO_TEMPLATE:    `-y -i arg -c:v libvpx-vp9 -s arg -keyint_min 150 -g 150 -b:v 0 -crf 42 -threads 8 -speed 2 -tile-columns 6 -frame-parallel 1 -an -sn -f webm -dash 1`,
  WEBM_AUDIO_TEMPLATE:    `-y -i arg -vn -sn -c:a libopus -b:a arg -f webm -dash 1`,
  WEBM_SUBTITLE_TEMPLATE: `-y -txt_format text -i arg`,
  WEBM_MANIFEST_TEMPLATE: `-y arg -c copy -f webm_dash_manifest -adaptation_sets "id=0,streams=arg id=1,streams=arg"`,

  MP4_VIDEO_TEMPLATE:     `-y -i "arg" -f 24 -an -c:v libx264 -profile:v main -preset slow -x264opts keyint=24:min-keyint=24:no-scenecut -vf scale=-1:arg -f mp4 -movflags frag_keyframe+empty_moov`,
  MP4_AUDIO_TEMPLATE:     `-y -i "arg" -vn -c:a libmp3lame -b:a arg`,
  MP4_SUBTITLE_TEMPLATE:  ``,
  MP4_MANIFEST_TEMPLATE:  `-dash 2000 -frag 2000 -rap -profile on-demand -bs-switching no -out arg "arg" "arg"`
};

const Snippets = { MANIFEST : '-f webm_dash_manifest', SETSAUDIO : 'id=1,streams=', SETSVIDEO: "id=0,streams=", MAP: "-map" };

function EncodeFactory() { }

EncodeFactory.prototype.getTemplate = function(codec, type) {
  return TEMPLATES[`${codec.toUpperCase()}_${type}_TEMPLATE`];
};

EncodeFactory.prototype.setKeyValue = function(key, newValue, str) {
  var regex = new RegExp(`-${key}\\s"[\\w,.-=:\\s]*"|-${key}\\s[^-][\\S]*|-${key}(?=\\s)`, 'g');
  var result = regex.exec(str);
  return str.substring(0, result.index)  + `-${key} ${newValue}` + str.substring(regex.lastIndex, str.length);
};

EncodeFactory.prototype.setOutput = function(path, str) {
  return `${str} ${path}`;
};

EncodeFactory.prototype.getOutput = function(str) {
  var regex = /[^-\s][\S]*/g;
  var lastValue;

  for(var itter = regex.exec(str); itter; itter = regex.exec(str)) {
    lastValue = itter[0];
  }

  return lastValue;
};

EncodeFactory.prototype.getNameFromPath = function(path) {
  var splitPath = path.split(/[//\\]+/);
  var splitType = splitPath[splitPath.length - 1].split('.');
  return splitType[0];
};

EncodeFactory.prototype.createManifest = function(input, output, commands, codec) {
  var maps = "copy ";
  var aSet = "";
  var vSet = "";
  var inputs = "";

  for(let i = 0; i < commands.length; ++i) {
    if(commands[i].type === this.TypeEnum.VIDEO) {
      vSet = `${vSet.length > 0 ? vSet : Snippets.SETSVIDEO}${vSet.length > 0 ? "," + i : i}`;
      inputs = `${inputs} ${Snippets.MANIFEST.trim()} -i ${this.getOutput(commands[i].input).trim()}`
      maps = `${maps.trim()} ${Snippets.MAP.trim()} ${i}`

    } else if(commands[i].type === this.TypeEnum.AUDIO) {
      aSet = `${aSet.length > 0 ? aSet : Snippets.SETSAUDIO}${aSet.length > 0 ? "," + i : i}`;
      inputs = `${inputs} ${Snippets.MANIFEST.trim()} -i ${this.getOutput(commands[i].input).trim()}`
      maps = `${maps.trim()} ${Snippets.MAP.trim()} ${i}`
    }
  }

  var template = this.getTemplate(codec, this.TypeEnum.MANIFEST);
  template = this.setKeyValue('y', `${inputs.trim()}`, template);
  template = this.setKeyValue('c', maps, template);
  template = this.setKeyValue('adaptation_sets', `"${vSet} ${aSet}"`, template);
  template = this.setOutput(`${output}${this.getNameFromPath(input)}_${codec}.mpd`, template);

  return template;
};

EncodeFactory.prototype.TypeEnum  = { VIDEO : 'VIDEO', AUDIO : 'AUDIO', SUBTITLE: 'SUBTITLE', MANIFEST: 'MANIFEST' };
EncodeFactory.prototype.CodecEnum = { WEBM : 'webm', MP4 : 'mp4' };
EncodeFactory.prototype.EncoderEnum = { FFMPEG : 'ffmpeg', MP4BOX : 'mp4box' };

module.exports = EncodeFactory;
