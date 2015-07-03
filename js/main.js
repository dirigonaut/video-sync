$(window).load(function(){
  function chooseFile(name) {
    var chooser = $(name);
    chooser.change(function(evt) {
      console.log($(this).val());
      $('#shared_video').attr({
        "src": $(this).val(),
        "autoplay": "autoplay",
      });
    });
  }
  chooseFile('#fileDialog');

//  videojs("shared_video", {}, function(){
//
//  });

  window.URL = window.URL || window.webkitURL;
  window.MediaSource = window.MediaSource || window.WebKitMediaSource;

  var mediaSource = new MediaSource();    
  mediaSource.addEventListener('webkitsourceopen', function(e)
  {
      console.log("Hell ya!");
      var sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vorbis,vp8,mp4"');
      var socket = io.connect('http://localhost:8080');

      if(socket)
          console.log('Library retrieved!');

      socket.emit('video-stream-req','REQUEST');

      socket.on('VS', function (data) 
      {
          console.log(data);
          sourceBuffer.append(data);
      });
  });

  var video = document.getElementById('shared_video');
  console.log(video);
  video.src = window.URL.createObjectURL(mediaSource);

});
