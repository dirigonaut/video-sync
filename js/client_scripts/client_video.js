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
  media_source.addEventListener('webkitsourceended',  media_source_state,    false);
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
    if (!buffer.updating || queue.length == 0) {
      media_source.endOfStream();
    } else if(queue.length == 0){
      close_stream = true;
    }
  }
};

function media_source_state(e){
  console.log('media_source state: ' + e.readyState);
};

function media_source_callback(e) {
  if(!buffer){
    console.log("Creating Buffer.");
    buffer = media_source.addSourceBuffer('video/webm; codecs="vp8,vorbis"');

    buffer.addEventListener('error',       function(e)  { console.log('error: '       + media_source.readyState); console.log(e);});
    buffer.addEventListener('abort',       function(e)  { console.log('abort: '       + media_source.readyState); console.log(e);});
    //buffer.addEventListener('updatestart', function(e)  { console.log('updatestart: ' + media_source.readyState); console.log(e);});
    //buffer.addEventListener('update',      function(e)  { console.log('update: '      + media_source.readyState); console.log(e);});
    //buffer.addEventListener('updateend',   function(e)  { console.log('updateend: '   + media_source.readyState); console.log(e);});

    buffer.addEventListener('update', function(e) {
      if (queue.length > 0 && media_source.readyState == "open" && !buffer.updating) {
        console.log("Appending from the queue.");
        buffer.appendBuffer(queue.shift());
      } else if(!buffer.updating || close_stream){
        media_source.endOfStream();
      }
    });
  }
};
