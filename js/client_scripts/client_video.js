window.URL = window.URL || window.webkitURL;
window.MediaSource = window.MediaSource || window.WebKitMediaSource;

var media_source;
var buffer;

var queue = new Array();
var video = document.getElementById('shared_video');

var close_stream = false;

//Create reset function to reset video elements

function client_video(){
  console.log("Create media source")
  media_source = new MediaSource();
  video.src = window.URL.createObjectURL(media_source);

  media_source.addEventListener('sourceopen',         media_source_callback, false);
  media_source.addEventListener('webkitsourceopen',   media_source_callback, false);
  media_source.addEventListener('webkitsourceended',  object_state,    false);
  media_source.addEventListener('sourceended',        object_state,    false);
};

client_video.prototype.handle_video_packet = function(data){
  if(data && data != null){
    if (buffer.updating || media_source.readyState != "open" || queue.length > 0) {
      queue.push(new Uint8Array(data));
    } else {
      console.log("Direct buffer append.")
      buffer.appendBuffer(new Uint8Array(data));
    }
  } else {
    if (media_source.readyState == "open" && !buffer.updating && queue.length == 0) {
      console.log("Closing media_source.");
      media_source.endOfStream();
    } else if(queue.length == 0){
      close_stream = true;
    }
  }
};

function object_state(e){
  console.log(e.target + " ready state : " + e.readyState);
  console.log(e);
};

function media_source_callback(e) {
  if(!buffer){
    console.log("Creating Buffer.");
    buffer = media_source.addSourceBuffer('video/webm; codecs="vp8,vorbis"');
    //buffer = media_source.addSourceBuffer('video/mp4; codecs="avc1.64000d,mp4a.40.2"');

    buffer.addEventListener('error',  object_state);
    buffer.addEventListener('abort',  object_state);
    buffer.addEventListener('update', on_buffer_update);
  }
};

function on_buffer_update(e){
  if(!buffer.updating){
    if (queue.length > 0) {
      console.log("Appending from the queue.");
      buffer.appendBuffer(queue.shift());
    } else if(close_stream){
      console.log("Closing media_source.");
      //media_source.endOfStream();
    }
  }
};
