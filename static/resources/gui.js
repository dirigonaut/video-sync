//Control Bar Events ----------------------------------------------------------
$('#btnPlay').click(function() {
  if ($('#video')[0].paused) {
    client.getClientSocket().sendRequest("state-req-play", client.getRequestFactory().buildPlayRequest());
  } else {
    client.getClientSocket().sendRequest("state-req-pause", client.getRequestFactory().buildPlayRequest());
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

$("video").on("pause", function (e) {
  $('.glyphicon-pause').attr('class', 'glyphicon glyphicon-play');
});

$("video").on("play", function (e) {
  $('.glyphicon-play').attr('class', 'glyphicon glyphicon-pause');
});

$("video").on("timeupdate", function (e) {
  $('#seek-bar').val($("#video")[0].currentTime / $("#video")[0].duration * 100);
});

//Session Events --------------------------------------------------------------
$('#createSession').click(function createSession() {
  var from    = $('#sessionAddress').val();
  var to      = $('#sessionInvitees').val();
  var subject = $('#sessionSubject').val();
  var text    = $('#sessionText').val();
  var html    = $('#sessionHtml').val();

  var mailOptions = client.getRequestFactory().buildMailOptionsRequest(from, to, subject, text, html);

  var title     = $('#sessionTitle').val();
  var address   = $('#sessionAddress').val();
  var invitees  = $('#sessionInvitees').val();

  client.getClientSocket().sendRequest("db-create-session",
    client.getRequestFactory().buildSessionRequest(title, address, invitees, mailOptions));
});

$('#readSessions').click(function readSessions() {
  client.getClientSocket().sendRequest("db-read-sessions");
});

//Smtp Events -----------------------------------------------------------------
$('#createContact').click(function createContact() {
  var handle  = $('#contactHandle').val();
  var address = $('#contactAddress').val();

  client.getClientSocket().sendRequest("db-create-contact",
    client.getRequestFactory().buildContactRequest(handle, address));
});

$('#createSmtp').click(function() {
  var type      = $('#smtpType').val();
  var host      = $('#smtpHost').val();
  var address   = $('#smtpAddress').val();
  var password  = $('#smtpPassword').val();

  client.getClientSocket().sendRequest("db-create-smtp",
    client.getRequestFactory().buildSmtpRequest(type, host, address, password));
});

$('#readContacts').click(function() {
  client.getClientSocket().sendRequest("db-read-contacts");
});

$('#readSmtps').click(function() {
  client.getClientSocket().sendRequest("db-read-smtps");
});

//Encode Events ---------------------------------------------------------------


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
