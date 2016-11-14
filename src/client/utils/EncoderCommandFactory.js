var FileUtils = require('../../server/utils/FileSystemUtils');
var fileUtils = new FileUtils();

function EncoderCommandFactory(){ }

EncoderCommandFactory.type_enum = {
  NULL  : 0,
  VIDEO : 1,
  AUDIO : 2
};

EncoderCommandFactory.buildFfmpegRequest = function(codec, type, source, output, scale){
  var command = new Object();

  command.outputDir = output;
  command.fileName  = genNewName(source, scale, codec);

  if(type == EncoderCommandFactory.type_enum.VIDEO){
    command.type = EncoderCommandFactory.type_enum.VIDEO;

    if(codec == "webm") {
      command.input = EncoderCommandFactory.getVideoWebmFfmpegCommand(source, output + command.fileName, scale);
    } else if(codec == "mp4") {
      command.input = EncoderCommandFactory.getVideoMp4FfmpegCommand(source, output + command.fileName, scale);
    }
  } else if (type == EncoderCommandFactory.type_enum.AUDIO){
    command.type = EncoderCommandFactory.type_enum.AUDIO;

    if(codec == "webm") {
      command.input = EncoderCommandFactory.getAudioWebmFfmpegCommand(source, output + command.fileName, scale);
    } else if(codec == "mp4") {
      command.input = EncoderCommandFactory.getAudioMp4FfmpegCommand(source, output + command.fileName, scale);
    }
  }

  command.codec = 'ffmpeg';
  return command;
}

EncoderCommandFactory.getVideoWebmFfmpegCommand = function(source, output, scale){
  return ' -y -i ' + source + ' -c:v libvpx-vp9 -s ' + scale + ' -keyint_min 150 -b:v 0 -crf 42 ' +
                  ' -g 150 -tile-columns 6 -frame-parallel 1 -an -f webm -dash 1 -speed 2 -threads 8 ' + output;
};

EncoderCommandFactory.getAudioWebmFfmpegCommand = function(source, output, scale){
  return ' -y -i ' + source + ' -vn -c:a libvorbis -b:a ' + scale + ' -f webm -dash 1 ' + output;
};

EncoderCommandFactory.getWebmManifestCommand = function(command_queue, output){
  var command       = new Object();
  var input         = "";
  var video_streams = "";
  var audio_streams = "";
  var maps          = "";

  for(var i in command_queue){
    if(command_queue[i].type == EncoderCommandFactory.type_enum.VIDEO){
      video_streams += video_streams == "" ? i : "," + i;
    } else if(command_queue[i].type == EncoderCommandFactory.type_enum.AUDIO){
      audio_streams += audio_streams == "" ? i : "," + i;
    }

    input += ' -f webm_dash_manifest -i ' + command_queue[i].outputDir + command_queue[i].fileName;

    maps += ' -map ' + i;
  }

  command.input = ' -y' + input + ' -c ' + 'copy' + maps + ' -f webm_dash_manifest -adaptation_sets ' + 'id=0,streams=' + video_streams + ' id=1,streams=' + audio_streams + ' ' + output
  command.codec = "ffmpeg";
  return command;
};

EncoderCommandFactory.getVideoMp4FfmpegCommand = function(source, output, scale){
  return ' -y -i ' + source + ' -g 52 -an -c:v libx264 -profile:v main -preset slow'
  + ' -vf scale=-1:' + scale.split("x")[1] + ' -f mp4 -movflags frag_keyframe+empty_moov '
  + output;
};

EncoderCommandFactory.getAudioMp4FfmpegCommand = function(source, output, scale){
  return ' -y -i ' + source + ' -vn -c:a libmp3lame -b:a ' + scale + ' ' + output;
};

EncoderCommandFactory.getMp4ManifestCommand = function(command_queue, output){
  var command       = new Object();
  var video_streams = "";
  var audio_streams = "";

  for(var i in command_queue){
    if(command_queue[i].type == EncoderCommandFactory.type_enum.VIDEO){
      video_streams += video_streams == "" ? command_queue[i].outputDir + command_queue[i].fileName: " " + command_queue[i].outputDir + command_queue[i].fileName;
    } else if(command_queue[i].type == EncoderCommandFactory.type_enum.AUDIO){
      audio_streams += audio_streams == "" ? command_queue[i].outputDir + command_queue[i].fileName: " " + command_queue[i].outputDir + command_queue[i].fileName;
    }
  }

  command.input = ' -dash 2000 -frag 2000 -rap -profile on-demand -bs-switching no -out ' + output + ' ' + video_streams + ' ' + audio_streams;
  command.codec = "mp4Box";
  return command;
};

module.exports = EncoderCommandFactory;

function genNewName(path, scale, codec){
  return fileUtils.splitNameFromPath(path) + "_" + scale + "." + codec;
};
