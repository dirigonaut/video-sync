//Control Bar event
$('#btnPlay').click(function(){
  if ($('#video')[0].paused) {
    client.getClientSocket().sendRequest("state-req-play", client.getRequestFactory().buildPlayRequest());
  } else {
    client.getClientSocket().sendRequest("state-req-pause", client.getRequestFactory().buildPlayRequest());
  }
});

$("video").on("pause", function (e) {
  $('.glyphicon-pause').attr('class', 'glyphicon glyphicon-play');
});

$("video").on("play", function (e) {
  $('.glyphicon-play').attr('class', 'glyphicon glyphicon-pause');
});
