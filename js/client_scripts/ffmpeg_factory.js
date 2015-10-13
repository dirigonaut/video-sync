function ffmpeg_factory(){ }

function gen_new_path(path, size, mime){
  var path_array = path.split(".");
  var parsed_path = path.substr(0, path.length - path_array[path_array.length-1].length)
  return parsed_path + "_" + size + "_" + "." + mime;
};

ffmpeg_factory.type_enum = {
  NULL  : 0,
  VIDEO : 1,
  AUDIO : 2
};

ffmpeg_factory.build_ffmpeg_request = function(source, encoding, size, type, options){
  return ffmpeg_factory.get_ffmpeg_preset(source, gen_new_path(source, size, encoding), encoding, size, type, options)
};

ffmpeg_factory.get_ffmpeg_preset = function(source, destination, encoding, size, type, options){
  var command = new Object();

  if(type == ffmpeg_factory.type_enum.VIDEO){
    command.input       = ffmpeg_factory.get_video_ffmpeg_preset(source, destination, encoding, size, options);
    command.destination = destination;
    command.type        = ffmpeg_factory.type_enum.VIDEO;
  } else if (type == ffmpeg_factory.type_enum.AUDIO){
    command.input       = ffmpeg_factory.get_audio_ffmpeg_preset(source, destination, encoding, size, options);
    command.destination = destination;
    command.type        = ffmpeg_factory.type_enum.AUDIO;
  }

  return command;
}

ffmpeg_factory.get_video_ffmpeg_preset = function(source, destination, encoding, size, options){
  switch(encoding) {
      case "webm":
        console.log("Using webm codec.");
        return ffmpeg_factory.get_ffmpeg_video_template(source, destination, 'libvpx-vp9', size, 'webm');
      case "mp4":
        console.log("Using mp4 codec.");
        return ffmpeg_factory.get_ffmpeg_video_template(source, destination, 'something', size, 'mp4');
      default:
        console.log("Using custom codec.");
        return options;
  }
};

ffmpeg_factory.get_audio_ffmpeg_preset = function(source, destination, encoding, quality, options){
  switch(encoding) {
      case "webm":
        console.log("Using webm codec.");
        return ffmpeg_factory.get_ffmpeg_audio_template(source, destination, 'libvorbis', quality, 'webm');
      case "mp4":
        console.log("Using mp4 codec.");
        return ffmpeg_factory.get_ffmpeg_audio_template(source, destination, 'something', quality, 'mp4');
      default:
        console.log("Using custom codec.");
        return options;
  }
};

ffmpeg_factory.add_manifest = function(command_queue, output, manifest_format){
  var input         = "";
  var video_streams = "";
  var audio_streams = "";
  var maps          = "";

  for(var i in command_queue){
    if(command_queue[i].type == ffmpeg_factory.type_enum.VIDEO){
      video_streams += video_streams == "" ? i : "," + i;
    } else if(command_queue[i].type == ffmpeg_factory.type_enum.AUDIO){
      audio_streams += audio_streams == "" ? i : "," + i;
    }

    input += " -f " + manifest_format + " -i " + command_queue[i].destination;

    maps += " -map " + i;
  }

  return " -y " + input + ' -c ' + 'copy' + maps + " -f " + manifest_format + ' -adaptation_sets ' + 'id=0,streams=' + video_streams + ' id=1,streams=' + audio_streams + ' ' + output
};

ffmpeg_factory.get_ffmpeg_video_template = function(source, output, codec, size, format){
  return ' -y' + ' -i ' + source + ' -c:v ' + codec + ' -s ' + size + ' -b:v ' + '500k' + ' -keyint_min ' + '150' +
                  ' -g ' + '150' + ' -tile-columns ' + '4' + ' -frame-parallel ' + '1' + ' -an' + ' -f ' + format + " -dash 1 " + output;
};

ffmpeg_factory.get_ffmpeg_audio_template = function(source, output, codec, quality, format){
  return ' -y' + ' -i ' + source + ' -c:a ' + codec + ' -b:a ' + quality + ' -vn' + ' -f ' + format + " -dash 1 " + output;
};

module.exports = ffmpeg_factory;
