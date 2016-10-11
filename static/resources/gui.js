//Control Bar Events ----------------------------------------------------------
function updateProgressBar(e) {
  $('#seek-bar').val($("#video")[0].currentTime / $("#video")[0].duration * 100);
}

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

  $('#seek-bar').val(request.seektime / $("#video")[0].duration * 100);
  $("video").on("timeupdate", updateProgressBar);
});

$('#seek-bar').on('mousedown', function() {
  $("video").off("timeupdate", updateProgressBar);
});

$('#btnFullScreen').click(function() {
  var video = $('#video')[0];

  if(document.fullScreen || document.webkitIsFullScreen) {
    video.webkitExitFullScreen();
    $('.control-bar-fullscreen').addClass("control-bar");
    $('.control-bar-fullscreen').removeClass("control-bar-fullscreen");
  } else {
    video.webkitRequestFullScreen();
    $('.control-bar').addClass("control-bar-fullscreen");
    $('.control-bar').removeClass("control-bar");
  }
});

$("video").on("pause", function (e) {
  $('.glyphicon-pause').attr('class', 'glyphicon glyphicon-play');
});

$("video").on("play", function (e) {
  $('.glyphicon-play').attr('class', 'glyphicon glyphicon-pause');
});

$("video").on("timeupdate", updateProgressBar);

$("#volume-bar").on("input change", function (e) {
  var range = parseInt($('#volume-bar').val()) * .01;
  $('#video')[0].volume = range;
});

//Location Events --------------------------------------------------------------
$('#btnSessionMedia').click(function() {
  console.log("Load new video.")
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
  var invitees  = ($('#sessionInvitees').val()).split(",");

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
  client.getClientSocket().sendRequest("admin-smtp-invite");
})

$('#sessionList').on("click", "tr", function(e) {
    var id = e.currentTarget.children[0].outerText;
    var formData = client.getFormDataSingleton();
    var sessions = formData.getSessionList();
    var session = null;

    if(id == "Session") {
      $("#sessionId").val("");
      $("#sessionTitle").val("");
      $("#sessionAddress").val("");
      $("#sessionInvitees").val("");
      $("#sessionSubject").val("");
      $("#sessionText").val("");
    } else {
      for(var i in sessions) {
        if(sessions[i]._id === id) {
          session = sessions[i];
          break;
        }
      }
    }

    if(session !== null && session !== undefined) {
      $("#sessionId").val(session._id);
      $("#sessionTitle").val(session.title);
      $("#sessionAddress").val(session.smtp);
      $("#sessionInvitees").val(session.invitees);
      $("#sessionSubject").val(session.mailOptions.subject);
      $("#sessionText").val(session.mailOptions.text);
    }
});

$('#sessionList').on("click", "button", function(e) {
  var session = $($(e.currentTarget).parent()).parent();
  console.log(session);
  var id = session[0].children[0].outerText;

  session.remove();

  client.getClientSocket().sendRequest("db-delete-session",
    client.getRequestFactory().buildSessionRequest(id, null, null, null, null));
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
    client.getRequestFactory().buildSmtpCreateRequest(type, host, address, password));
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
  var loadSessions = function() {
    var formData = client.getFormDataSingleton();
    var sessions = formData.getSessionList();

    if(sessions.length > 0) {
      if($("#sessionId").val() == '') {
        var session = sessions[0];

        if(session !== null && session !== undefined) {
          $("#sessionId").val(session._id);
          $("#sessionTitle").val(session.title);
          $("#sessionAddress").val(session.smtp);
          $("#sessionInvitees").val(session.invitees);
          $("#sessionSubject").val(session.mailOptions.subject);
          $("#sessionText").val(session.mailOptions.text);
        }
      }

      $('#sessionList tbody tr:not(:first)').remove();


      for(var i in sessions) {
        $('#sessionList tr:last').after('<tr><td style="display:none;">' + sessions[i]._id + '</td><td>' + sessions[i].title +
        '<button type="button" class="close overlay-icon-right" aria-label="Close"><span aria-hidden="true">&times;</span></button></td></tr>');
      }
    }
  };

  //needs to be put somewhere else
  client.getClientSocket().setEvent("db-sessions", loadSessions);
  loadSessions();

  $('#sessionModal').modal('show');
  $('#sessionModal').on('shown', function() {
    $("#sessionId").focus();
  })
});

$('#btnSmtp').click(function() {
  var formData = client.getFormDataSingleton();
  var smtps = formData.getSmtpList();
  console.log(smtps);

  if(smtps.length > 0) {
    if($("#smtpId").val() == '') {
      var smtp = smtps[0];

      if(smtp !== null && smtp !== undefined) {
        $("#smtpId").val(smtp._id);
        $("#smtpType").val(smtp.type);
        $("#smtpHost").val(smtp.smtpHost);
        $("#smtpAddress").val(smtp.smtpAddress);
        $("#smtpPassword").val(smtp.smtpPassword);
      }
    }

    $('#smtpList tbody tr:not(:first)').remove();

    for(var i in smtps) {
      $('#smtpList tr:last').after('<tr><td style="display:none;">' + smtps[i]._id + '</td><td>' + smtps[i].smtpAddress + '</td></tr>');
    }
  }

  $('#smtpModal').modal('show');
  $('#smtpModal').on('shown', function() {
    $("#smtpId").focus();
  })
});

$('#btnSmtp').click(function() {
  $('#smtpModal').modal('show');
  $('#smtpModal').on('shown', function() {
    $("#smtpType").focus();
  })
});

$('#btnEncode').click(function() {
  $('#encodeModal').modal('show');
  $('#encodeModal').on('shown', function() {
    $("#encodeInput").focus();
  })
});

$('#btnLogin').click(function() {
  $('#loginModal').modal('show');
  $('#loginModal').on('shown', function() {
    $("#loginUser").focus();
  });
});

//Login Events -----------------------------------------------------------------
$('#submitCreds').click(function readContacts() {
  var user     = $('#loginUser').val();
  var token    = $('#loginToken').val();
  console.log("testing");

  if(token.length > 0) {
    client.getClientSocket().sendRequest('auth-validate-token', client.getRequestFactory().buildLoginRequest(user, token));
  } else {
    client.getClientSocket().sendRequest('auth-get-token', client.getRequestFactory().buildLoginRequest(user, token));
  }
});

//Chat Events ------------------------------------------------------------------
$('#sendChat').click(function() {
  var message = client.getChatUtil().parseInput($('#chatMessage').val(), null);
  $('#chatMessage').val("");

  client.getClientSocket().sendRequest('chat-broadcast', message);
});

client.getClientSocket().setEvent('chat-broadcast-resp', function(message) {
  console.log("chat-broadcast-resp");
  $('#chatManuscript').append(client.getChatUtil().getUserHandle(message.from) + ": " + message.text + "\n");
});

client.getClientSocket().setEvent('chat-log-resp', function(message) {
  console.log("chat-log-resp");
  $('#logManuscript').append(message.from + ": " + message.text + "\n");
});

client.getChatUtil().on('client-log', function(message) {
  console.log("client-log");
  $('#logManuscript').append(message.from + ": " + message.text + "\n");
});

//CSS Animation ----------------------------------------------------------------
var opaque = false;

$('.container').mousemove(function(e) {
  if(!opaque) {
    opaque = true;
    showUI();
    inactive();
  }
});

function inactive() {
    setTimeout(function() {
      opaque = false;
      hideUI();
    }, 3000);
}

function hideUI() {
  $('.fadein').addClass("fadeout");
  $('.fadein').removeClass("fadein");
}

function showUI() {
  $('.fadeout').addClass("fadein");
  $('.fadeout').removeClass("fadeout");
}
