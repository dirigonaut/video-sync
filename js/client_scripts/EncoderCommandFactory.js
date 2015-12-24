function EncoderCommandFactory(){ }

function gen_new_path(path, scale){
  var parsed_path = path.split(".");
  return path.substr(0, path.length - parsed_path[parsed_path.length-1].length-1) + "_" + scale + ".mp4";
};

EncoderCommandFactory.type_enum = {
  NULL  : 0,
  VIDEO : 1,
  AUDIO : 2
};

EncoderCommandFactory.build_ffmpeg_request = function(source, scale, type){
  return EncoderCommandFactory.get_ffmpeg_commands(source, gen_new_path(source, scale), scale, type)
};

EncoderCommandFactory.get_ffmpeg_commands = function(source, destination, scale, type){
  var command = new Object();

  if(type == EncoderCommandFactory.type_enum.VIDEO){
    command.input       = EncoderCommandFactory.get_video_ffmpeg_command(source, destination, scale);
    command.destination = destination;
    command.type        = EncoderCommandFactory.type_enum.VIDEO;
  } else if (type == EncoderCommandFactory.type_enum.AUDIO){
    command.input       = EncoderCommandFactory.get_audio_ffmpeg_command(source, destination, scale);
    command.destination = destination;
    command.type        = EncoderCommandFactory.type_enum.AUDIO;
  }

  command.process = "ffmpeg";
  return command;
}

EncoderCommandFactory.get_video_ffmpeg_command = function(source, destination, scale){
  return ' -y -i ' + source + ' -an -c:v libx264 -x264opts keyint=24:min-keyint=24:no-scenecut'
  + ' -b:v 1500k -maxrate 1500k -bufsize 1000k -vf scale=-1:' + scale + ' ' + destination;
};

EncoderCommandFactory.get_audio_ffmpeg_command = function(source, destination, scale){
  return ' -y -i ' + source + ' -vn -c:a libmp3lame -b:a ' + scale + ' ' + destination;
};

EncoderCommandFactory.get_manifest_command = function(command_queue, output){
  var command       = new Object();
  var video_streams = "";
  var audio_streams = "";

  for(var i in command_queue){
    if(command_queue[i].type == EncoderCommandFactory.type_enum.VIDEO){
      video_streams += video_streams == "" ? command_queue[i].destination : " " + command_queue[i].destination;
    } else if(command_queue[i].type == EncoderCommandFactory.type_enum.AUDIO){
      audio_streams += audio_streams == "" ? command_queue[i].destination : " " + command_queue[i].destination;
    }
  }

  command.input = ' -dash 2000 -rap -frag-rap -profile onDemand -out '  + output + ' ' + video_streams + ' ' + audio_streams;
  command.process = "MP4Box";
  return command
};

module.exports = EncoderCommandFactory;
