var ss = require('socket.io-stream');

var socket = io.connect('http://localhost:8080');

window.URL = window.URL || window.webkitURL;
window.MediaSource = window.MediaSource || window.WebKitMediaSource;

var mediaSource = new MediaSource();
var buffer;

var video = document.getElementById('shared_video');

var queue = [];

video.src = window.URL.createObjectURL(mediaSource);

function video_streaming(){
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
  }, false);

  socket.emit('video-stream', "");
}

socket.on("video-packet", function(data) {
  if(typeof data !== 'string'){
    if (buffer.updating || queue.length > 0) {
      queue.push(data);
    } else {
      buffer.appendBuffer(data);
    }
  }
});
