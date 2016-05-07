//Control Bar event
$('#btnPlay').click(function(){
  client.getClientSocket().sendRequest("state-play", client.getRequestFactory().buildPlayRequest());
});
