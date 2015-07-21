var socket = io.connect('http://localhost:8080');

window.URL = window.URL || window.webkitURL;
window.MediaSource = window.MediaSource || window.WebKitMediaSource;

var mediaSource;
var buffer;

var queue = [];
var video = document.getElementById('shared_video');

function video_streaming(){
  mediaSource = new MediaSource();
  video.src = window.URL.createObjectURL(mediaSource);

  video.play();

  mediaSource.addEventListener('sourceopen', function(event) {
    buffer = mediaSource.addSourceBuffer('video/webm; codecs="vorbis,vp8"');

    buffer.addEventListener('error', function(e) { console.log('error: ' + mediaSource.readyState); });
    buffer.addEventListener('abort', function(e) { console.log('abort: ' + mediaSource.readyState); });

    buffer.addEventListener('update', function() {
      if (queue.length > 0 && !buffer.updating) {
        buffer.appendBuffer(queue.shift());
      }
    });

    socket.emit('video-stream', "");
  }, false);
}

socket.on("video-packet", function(data) {
  console.log("Got video packet.");
  console.log(buffer);
  if(typeof data !== 'string'){
    if (buffer.updating || queue.length > 0) {
      queue.push(data);
    } else {
      buffer.appendBuffer(data);
    }
  }
});
