//Control Bar Events ----------------------------------------------------------
$('#btnPlay').click(function() {
  if ($('#video')[0].paused) {
    client.getClientSocket().sendRequest("state-req-play", client.getRequestFactory().buildStateRequest("play", $("#video")[0].currentTime));
  } else {
    client.getClientSocket().sendRequest("state-req-pause", client.getRequestFactory().buildStateRequest("pause", $("#video")[0].currentTime));
  }
});

$('#btnMute').click(function() {
  if ($('#video')[0].muted) {
    $('.glyphicon-volume-off').attr('class', 'glyphicon glyphicon-volume-up');
    $("video").prop('muted', false);
  } else {
    $('.glyphicon-volume-up').attr('class', 'glyphicon glyphicon-volume-off');
    $("video").prop('muted', true);
  }
});

$('#seek-bar').on('mouseup', function() {
  var percent = parseInt($('#seek-bar').val());
  var length  = $('#video')[0].duration;
  var request = new Object();
  request.seektime = Math.round(length * (percent / 100));
  client.getClientSocket().sendRequest('state-req-seek', request, false);
});

$('#btnFullScreen').click(function() {
  $('#video')[0].webkitRequestFullScreen();
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

$("#volume-bar").on("input change", function (e) {
  var range = parseInt($('#volume-bar').val()) * .01;
  $('#video')[0].volume = range;
});

//Location Events --------------------------------------------------------------
$('#btnSessionMedia').click(function() {
    var media = $('#locationBar').val();
    client.getClientSocket().sendRequest("admin-set-media", media);
});

//Session Events --------------------------------------------------------------
$('#createSession').click(function createSession() {
  var from    = $('#sessionAddress').val();
  var to      = $('#sessionInvitees').val();
  var subject = $('#sessionSubject').val();
  var text    = $('#sessionText').val();
  var html    = $('#sessionHtml').val();

  var mailOptions = client.getRequestFactory().buildMailOptionsRequest(from, to, subject, text, html);

  var id        = $('#sessionId').val();
  var title     = $('#sessionTitle').val();
  var address   = $('#sessionAddress').val();
  var invitees  = [$('#sessionInvitees').val()];

  client.getClientSocket().sendRequest("db-create-session",
    client.getRequestFactory().buildSessionRequest(id, title, address, invitees, mailOptions));
});

$('#readSessions').click(function readSessions() {
  client.getClientSocket().sendRequest("db-read-sessions");
});

$('#setSession').click(function setSession() {
  var sessionId = $('#sessionId').val();
  client.getClientSocket().sendRequest("admin-load-session", sessionId);
});

$('#sendInvitation').click(function readSessions() {
  client.getClientSocket().sendRequest("smtp-invite");
});

//Smtp Events -----------------------------------------------------------------
$('#createContact').click(function createContact() {
  var handle  = $('#contactHandle').val();
  var address = $('#contactAddress').val();

  client.getClientSocket().sendRequest("db-create-contact",
    client.getRequestFactory().buildContactRequest(handle, address));
});

$('#createSmtp').click(function createSmtp() {
  var type      = $('#smtpType').val();
  var host      = $('#smtpHost').val();
  var address   = $('#smtpAddress').val();
  var password  = $('#smtpPassword').val();

  client.getClientSocket().sendRequest("db-create-smtp",
    client.getRequestFactory().buildSmtpRequest(type, host, address, password));
});

$('#readContacts').click(function readContacts() {
  client.getClientSocket().sendRequest("db-read-contacts");
});

$('#readSmtps').click(function readSmtps() {
  client.getClientSocket().sendRequest("db-read-smtps");
});

//Encode Events ---------------------------------------------------------------
$('#createEncoding').click(function createEncoding() {
  var input     = $('#encodeInput').val();
  var output    = $('#encodeOutput').val();
  var vQuality  = $('#encodeVideoQuality').val();
  var aQuality  = $('#encodeAudioQuality').val();

  var commands = [];
  var factory = client.getCommandFactory();

  commands.push(factory.build_ffmpeg_request(input , output, vQuality, "1"));
  commands.push(factory.build_ffmpeg_request(input, output, aQuality, "2"));
  commands.push(factory.get_ffmpeg_manifest_command(commands, output + "bunny.mpd"));

  client.getClientSocket().sendRequest('video-encode', commands);
});

//Side Events -----------------------------------------------------------------
$('#btnSession').click(function() {
  $('#sessionOverlay').show();
  $('#smtpOverlay').hide();
  $('#encodeOverlay').hide();
});

$('#btnSmtp').click(function() {
  $('#sessionOverlay').hide();
  $('#smtpOverlay').show();
  $('#encodeOverlay').hide();
});

$('#btnEncode').click(function() {
  $('#sessionOverlay').hide();
  $('#smtpOverlay').hide();
  $('#encodeOverlay').show();
});

//Login Events -----------------------------------------------------------------
$('#submitCreds').click(function readContacts() {
  var user     = $('#loginUser').val();
  var token    = $('#loginToken').val();

  if(token.length > 0) {
    client.getClientSocket().sendRequest('auth-validate-token', client.getRequestFactory().buildLoginRequest(user, token));
  } else {
    client.getClientSocket().sendRequest('auth-get-token', client.getRequestFactory().buildLoginRequest(user, token));
  }
});
