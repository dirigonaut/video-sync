var socket = io.connect('http://localhost:8080');

window.URL = window.URL || window.webkitURL;
window.MediaSource = window.MediaSource || window.WebKitMediaSource;

var media_source;
var buffer;

var queue = [];
var video = document.getElementById('shared_video');

var end_of_stream = false;

function video_streaming(){
  media_source = new MediaSource();
  video.src = window.URL.createObjectURL(media_source);

  video.play();

  media_source.addEventListener('sourceopen', function(e) {
    buffer = media_source.addSourceBuffer('video/webm; codecs="vorbis,vp8"');

    buffer.addEventListener('error', function(e) { console.log('error: ' + media_source.readyState); });
    buffer.addEventListener('abort', function(e) { console.log('abort: ' + media_source.readyState); });

    buffer.addEventListener('update', function() {
      if (queue.length > 0 && !buffer.updating) {
        buffer.appendBuffer(queue.shift());
      } else if(end_of_stream){
        media_source.endOfStream();
      }
    });

    socket.emit('video-stream', "");
  }, false);

  media_source.addEventListener('sourceopen', function(e) { console.log('sourceopen: ' + media_source.readyState); });
  media_source.addEventListener('sourceended', function(e) { console.log('sourceended: ' + media_source.readyState); });
  media_source.addEventListener('sourceclose', function(e) { console.log('sourceclose: ' + media_source.readyState); });
}

socket.on("video-packet", function(data) {
  if(data){
    var chunk = new Uint8Array(data);
    if (buffer.updating || queue.length > 0) {
      queue.push(chunk);
    } else {
      buffer.appendBuffer(chunk);
    }
  } else {
    if (!buffer.updating || queue.length == 0) {
      media_source.endOfStream();
    } else {
      end_of_stream = true;
    }
  }
});
