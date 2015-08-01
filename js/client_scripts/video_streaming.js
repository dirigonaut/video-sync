
var socket  = io.connect('http://localhost:8080');

window.URL = window.URL || window.webkitURL;
window.MediaSource = window.MediaSource || window.WebKitMediaSource;

var media_source;
var buffer;

var queue = new Array();
var video = document.getElementById('shared_video');

function video_streaming(){
  media_source = new MediaSource();
  video.src = window.URL.createObjectURL(media_source);

  media_source.addEventListener('sourceopen', media_source_callback, false);
  media_source.addEventListener('webkitsourceopen', media_source_callback, false);
  media_source.addEventListener('webkitsourceended', media_source_state , false);
};

function media_source_state(e){
  console.log('media_source state: ' + e.readyState);
};

function media_source_callback(e) {
  buffer = media_source.addSourceBuffer('video/webm; codecs="vp8,vorbis"');

  buffer.addEventListener('error', function(e) { console.log('error: ' + media_source.readyState); });
  buffer.addEventListener('abort', function(e) { console.log('abort: ' + media_source.readyState); });

  buffer.addEventListener('update', function(e) {
    if (queue.length > 0 && !buffer.updating) {
      buffer.appendBuffer(queue.shift());
    } else {
      media_source.endOfStream();
    }
  });

  socket.emit('video-stream', '');
};

socket.on('video-packet', function(data){
  console.log('video-packet');
    if(data){
      if (buffer.updating || queue.length > 0) {
        queue.push(new Uint8Array(data));
      } else {
        buffer.appendBuffer(new Uint8Array(data));
      }
    } else {
      if (!buffer.updating || queue.length == 0) {
        media_source.endOfStream();
      }
    }
});
