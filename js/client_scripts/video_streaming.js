var ss = require('socket.io-stream');

var mediaSource;
var video;

function video_streaming(){
  window.URL = window.URL || window.webkitURL;
  window.MediaSource = window.MediaSource || window.WebKitMediaSource;

  video = document.getElementById('shared_video');

  mediaSource = new MediaSource();
  video.src = window.URL.createObjectURL(mediaSource);

  mediaSource.addEventListener('sourceopen', function(event) {
    console.log(mediaSource.readyState);

    var sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.64001E"');
    var socket = io.connect('http://localhost:8080');
    var stream = ss.createStream();

    ss(socket).emit('video-stream', stream);

    //stream.pipe(sourceBuffer);
  })
};
