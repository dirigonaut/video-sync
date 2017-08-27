const TEMPLATES = {
  WEBM_VIDEO_TEMPLATE:    `-y -i "arg" -c:v libvpx-vp9 -s arg -keyint_min 150 -g 150 -b:v 0 -crf 42 -threads 8 -speed 2 -tile-columns 6 -frame-parallel 1 -an -f webm -dash 1 "arg"`,
  WEBM_AUDIO_TEMPLATE:    `-y -i "arg" -vn -c:a libopus -b:a arg -f webm -dash 1 "arg"`,
  WEBM_SUBTITLE_TEMPLATE: ``,
  WEBM_MANIFEST_TEMPLATE: `-y -f webm_dash_manifest -i "arg" -c copy -maps arg -f webm_dash_manifest -adaptation_sets "id=0,streams=arg id=1,streams=arg" "arg"`,
  MP4_VIDEO_TEMPLATE:     `-y -i "arg" -f 24 -an -c:v libx264 -profile:v main -preset slow -x264opts keyint=24:min-keyint=24:no-scenecut -vf scale=-1:arg -f mp4 -movflags frag_keyframe+empty_moov "arg"`,
  MP4_AUDIO_TEMPLATE:     `-y -i "arg" -vn -c:a libmp3lame -b:a arg "arg"`,
  MP4_SUBTITLE_TEMPLATE:  ``,
  MP4_MANIFEST_TEMPLATE:  `-dash 2000 -frag 2000 -rap -profile on-demand -bs-switching no -out arg "arg" "arg"`
};

function EncodeFactory() { }

EncodeFactory.prototype.getTemplate = function(codec, type) {
  return TEMPLATES[`${codec}_${type}_TEMPLATE`];
};

EncodeFactory.prototype.setKeyValue = function(key, newValue, str) {
  var regex = new RegExp(`-${key}\\s[^-][0-9A-Za-z-_"]*`, 'g');
  var result = regex.exec(str);
  return str.substring(0, result.index)  + `-${key} ${newValue}` + str.substring(regex.lastIndex, str.length);
};

EncodeFactory.prototype.setOutput = function(path, str) {
  var regex = /-[A-Za-z:_-]*\s[^-"][0-9A-Za-z-_]*|-[A-Za-z:_-]*\s"[A-Za-z0-9=,\s]*"|-[A-Za-z:_-]*/g;
  var lastIndex, lastValue;

  for(var itter = regex.exec(str); itter; itter = regex.exec(str)) {
    lastIndex = regex.lastIndex;
    lastValue = itter[0];
  }

  return str.substring(0, lastIndex) + ` "${path}"`;
};

EncodeFactory.prototype.setStream = function(value, str) {
  var regex = /-[A-Za-z:_-]*\s"[A-Za-z0-9=,\s]*"/g;
  var result = regex.exec(str);
  return str.substring(0, result.index)  + `${value}` + str.substring(regex.lastIndex, str.length);
};

EncodeFactory.prototype.getKeyValue = function(key, str) {
  var regex = new RegExp(`-${key}\\s[^-][0-9A-Za-z-_]*`, 'g');
  return regex.exec(str);
};

EncodeFactory.prototype.getOutput = function(str) {
  var regex = /-[A-Za-z:_-]*\s[^-"][0-9A-Za-z-_]*|-[A-Za-z:_-]*\s"[A-Za-z0-9=,\s]*"|-[A-Za-z:_-]*/g;
  var lastIndex, lastValue;

  for(var itter = regex.exec(str); itter; itter = regex.exec(str)) {
    lastIndex = regex.lastIndex;
    lastValue = itter[0];
  }

  return str.substring(lastIndex, str.length);
};

EncodeFactory.prototype.getStream = function(key, str) {
  var regex = /-[A-Za-z:_-]*\s"[A-Za-z0-9=,\s]*"/g;
  return regex.exec(str);
};

EncodeFactory.prototype.TypeEnum  = { VIDEO : 'VIDEO', AUDIO : 'AUDIO', MANIFEST: 'MANIFEST' };
EncodeFactory.prototype.CodecEnum = { WEBM : 'WEBM', MP4 : 'MP4' };

module.exports = EncodeFactory;
