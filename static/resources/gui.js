//Control Bar event
$('#btnPlay').click(function(){
  if ($('#video')[0].paused) {
    client.getClientSocket().sendRequest("state-req-play", client.getRequestFactory().buildPlayRequest());
  } else {
    client.getClientSocket().sendRequest("state-req-pause", client.getRequestFactory().buildPlayRequest());
  }
});

$('#btnMute').click(function(){
  if ($('#video')[0].muted) {
    $('.glyphicon-volume-off').attr('class', 'glyphicon glyphicon-volume-up');
    $("video").prop('muted', false);
  } else {
    $('.glyphicon-volume-up').attr('class', 'glyphicon glyphicon-volume-off');
    $("video").prop('muted', true);
  }
});

$("video").on("pause", function (e) {
  $('.glyphicon-pause').attr('class', 'glyphicon glyphicon-play');
});

$("video").on("play", function (e) {
  $('.glyphicon-play').attr('class', 'glyphicon glyphicon-pause');
});

$("video").on("timeupdate", function (e) {
  $('#seek-bar').val($("#video")[0].currentTime / $("#video")[0].duration * 100);
});
