function initGUI() {
  console.log("Gui initialized");

  //Control Bar Events ----------------------------------------------------------
  function updateProgressBar(e) {
    $('#seek-bar').val($("#video")[0].currentTime / $("#video")[0].duration * 100);
  }

  $('#btnPlay').click(function() {
    if ($('#video')[0].paused) {
      clientSocket.sendRequest("state-req-play", client.getRequestFactory().buildStateRequest("play", $("#video")[0].currentTime));
    } else {
      clientSocket.sendRequest("state-req-pause", client.getRequestFactory().buildStateRequest("pause", $("#video")[0].currentTime));
    }
  });

  $('#btnMute').click(function() {
    if ($('#video')[0].muted) {
      $('.glyphicon-volume-off').attr('class', 'glyphicon glyphicon-thumbnail glyphicon-volume-up');
      $("video").prop('muted', false);
    } else {
      $('.glyphicon-volume-up').attr('class', 'glyphicon glyphicon-thumbnail glyphicon-volume-off');
      $("video").prop('muted', true);
    }
  });

  $('#seek-bar').on('mouseup', function() {
    var percent = parseInt($('#seek-bar').val());
    var length  = $('#video')[0].duration;
    var request = new Object();
    request.seektime = Math.round(length * (percent / 100));
    clientSocket.sendRequest('state-req-seek', request, false);

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
    $('.glyphicon-pause').attr('class', 'glyphicon glyphicon-thumbnail glyphicon-play');
  });

  $("video").on("play", function (e) {
    $('.glyphicon-play').attr('class', 'glyphicon glyphicon-thumbnail glyphicon-pause');
  });

  $("video").on("timeupdate", updateProgressBar);

  $("#volume-bar").on("input change", function (e) {
    var range = parseInt($('#volume-bar').val()) * .01;
    $('#video')[0].volume = range;
  });

  $("#btnOptions").on("click", function (e) {
    if($(".pop-over").css('display') === 'none') {
      $(".pop-over").show();
    } else {
      $(".pop-over").hide();
    }
  });


  //Location Events --------------------------------------------------------------
  $('#btnSessionMedia').click(function() {
    console.log("Load new video.")
      var media = $('#locationBar').val();
      clientSocket.sendRequest("admin-set-media", media);
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

    if(id == null || id == undefined || id == "") {
      clientSocket.sendRequest("db-create-session",
        client.getRequestFactory().buildSessionRequest(title, address, invitees, mailOptions));
    } else {
      clientSocket.sendRequest("db-update-session", [id,
        client.getRequestFactory().buildSessionRequest(title, address, invitees, mailOptions)]);
    }
  });

  $('#readSessions').click(function readSessions() {
    clientSocket.sendRequest("db-read-sessions");
  });

  $('#setSession').click(function setSession() {
    var sessionId = $('#sessionId').val();
    clientSocket.sendRequest("admin-load-session", sessionId);
  });

  $('#sendInvitation').click(function readSessions() {
    clientSocket.sendRequest("admin-smtp-invite");
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
        $("#createSession").html("Create");
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
        $("#createSession").html("Save");
      }
  });

  $('#sessionList').on("click", "button", function(e) {
    var session = $($(e.currentTarget).parent()).parent();
    console.log(session);
    var id = session[0].children[0].outerText;

    session.remove();

    clientSocket.sendRequest("db-delete-session", id);
  });

  //Smtp Events -----------------------------------------------------------------
  $('#createContact').click(function createContact() {
    var handle  = $('#contactHandle').val();
    var address = $('#contactAddress').val();

    clientSocket.sendRequest("db-create-contact",
      client.getRequestFactory().buildContactRequest(handle, address));
  });

  $('#createSmtp').click(function createSmtp() {
    var id        = $('#smtpId').val();
    var type      = $('#smtpType').val();
    var host      = $('#smtpHost').val();
    var address   = $('#smtpAddress').val();
    var password  = $('#smtpPassword').val();

    if(id == null || id == undefined || id == "") {
      clientSocket.sendRequest("db-create-smtp",
        client.getRequestFactory().buildSmtpRequest(type, host, address, password));
    } else {
      clientSocket.sendRequest("db-update-smtp", [id,
        client.getRequestFactory().buildSmtpRequest(type, host, address, password)]);
    }
  });

  $('#readContacts').click(function readContacts() {
    clientSocket.sendRequest("db-read-contacts");
  });

  $('#readSmtps').click(function readSmtps() {
    clientSocket.sendRequest("db-read-smtps");
  });

  $('#smtpList').on("click", "tr", function(e) {
      var id = e.currentTarget.children[0].outerText;
      var formData = client.getFormDataSingleton();
      var smtps = formData.getSmtpList();
      var smtp = null;

      if(id == "Smtp") {
        $("#smtpId").val("");
        $("#smtpType").val("");
        $("#smtpHost").val("");
        $("#smtpAddress").val("");
        $("#smtpPassword").val("");
        $("#createSmtp").html("Create");
      } else {
        for(var i in smtps) {
          if(smtps[i]._id === id) {
            smtp = smtps[i];
            break;
          }
        }
      }

      if(smtp !== null && smtp !== undefined) {
        $("#smtpId").val(smtp._id);
        $("#smtpType").val(smtp.smtpType);
        $("#smtpHost").val(smtp.smtpHost);
        $("#smtpAddress").val(smtp.smtpAddress);
        $("#smtpPassword").val(smtp.smtpPassword);
        $("#createSmtp").html("Save");
      }
  });

  $('#smtpList').on("click", "button", function(e) {
    var smtp = $($(e.currentTarget).parent()).parent();
    var id = smtp[0].children[0].outerText;

    smtp.remove();

    clientSocket.sendRequest("db-delete-smtp", id);
  });

  //Encode Events ---------------------------------------------------------------
  $('#createEncoding').click(function createEncoding() {
    var input     = $('#encodeInput').val();
    var output    = $('#encodeOutput').val();
    var vQuality  = $("input[name=video-quality]:checked");
    var aQuality  = $("input[name=audio-quality]:checked");

    console.log(vQuality);
    var commands = [];
    var factory = client.getCommandFactory();

    if($("#codec-webm:checked").val()) {
      for(var i = 0; i < vQuality.length; ++i) {
        commands.push(factory.buildFfmpegRequest("webm", "1", input, output, $(vQuality[i]).val()));
      }

      for(var i = 0; i < aQuality.length; ++i) {
        commands.push(factory.buildFfmpegRequest("webm", "2", input, output, $(aQuality[i]).val()));
      }

      commands.push(factory.getWebmManifestCommand(commands,
              output + client.getFileUtil().splitNameFromPath(input) + "_webm.mpd"));
    }

    if($("#codec-mp4:checked").val()) {
      for(var i = 0; i < vQuality.length; ++i) {
        commands.push(factory.buildFfmpegRequest("mp4", "1", input, output, $(vQuality[i]).val()));
      }
      for(var i = 0; i < aQuality.length; ++i) {
        commands.push(factory.buildFfmpegRequest("mp4", "2", input, output, $(aQuality[i]).val()));
      }

      commands.push(factory.getMp4ManifestCommand(commands,
              output + client.getFileUtil().splitNameFromPath(input) + "_mp4.mpd"));
    }

    clientSocket.sendRequest('video-encode', commands);
  });

  //Side Events -----------------------------------------------------------------
  $('#btnSession').click(function() {
    loadSessions();

    $('#sessionModal').modal('show');
    $('#sessionModal').on('shown', function() {
      $("#sessionId").focus();
    })
  });

  var loadSessions = function() {
    var formData = client.getFormDataSingleton();
    var sessions = formData.getSessionList();

    if(sessions.length > 0) {
      if($("#sessionId").val() == '') {
        var session = sessions[0];        ();!== undefined) {
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

  clientSocket.setEvent("db-sessions", loadSessions);

  $('#btnSmtp').click(function() {
    loadSmtps();

    $('#smtpModal').modal('show');
    $('#smtpModal').on('shown', function() {
      $("#smtpType").focus();
    });
  });

  var loadSmtps = function() {
    var formData = client.getFormDataSingleton();
    var smtps = formData.getSmtpList();

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
        $('#smtpList tr:last').after('<tr><td style="display:none;">' + smtps[i]._id + '</td><td>' + smtps[i].smtpAddress +
        '<button type="button" class="close overlay-icon-right" aria-label="Close"><span aria-hidden="true">&times;</span></button></td></tr>');
      }
    }
  }

  clientSocket.setEvent("db-smtps", loadSmtps);

  $('#btnEncode').click(function() {
    $('#encodeModal').modal('show');
    $('#encodeModal').on('shown', function() {
      $("#encodeInput").focus();
    });
  });

  //Chat Events ------------------------------------------------------------------
  function sendChat() {
    var value = $('#chatMessage').val();
    $('#chatMessage').val("");

    if(value.trim().length > 0) {
      if(value.match(/^\//)) {
        var command = client.getChatUtil().parseInput(value);
        clientSocket.sendRequest('chat-command', command);
      } else {
        var message = client.getChatUtil().createMessage(value);
        clientSocket.sendRequest('chat-broadcast', message);
      }
    }
  }

  function autoScroll() {
    $('#chatManuscript').scrollTop($('#chatManuscript')[0].scrollHeight);
  }

  $('#sendChat').click(function() {
    sendChat();
  });

  $('#chatMessage').keydown(function(event) {
    var keyId = event.keyCode || event.which;

    if (keyId === 13) {
      event.preventDefault();
      sendChat();
    }
  });


  clientSocket.setEvent('chat-broadcast-resp', function(message) {
    console.log("chat-broadcast-resp");
    $('#chatManuscript').append(`<p><span class="chat-message" title="${message.from}" style="color:blue; font-weight: bold;">
      ${new Date().toTimeString().split(" ")[0]} ${client.getChatUtil().getUserHandle(message.from)}: </span>${message.text}</p>`);
    autoScroll();
  });

  clientSocket.setEvent('chat-event-resp', function(message) {
    console.log("chat-event-resp");
    $('#chatManuscript').append(`<p><span class="chat-message" title="System" style="color:gray; font-weight: bold;">
      ${new Date().toTimeString().split(" ")[0]} System: </span>${client.getChatUtil().getUserHandle(message.from)} ${message.text}</p>`);
    autoScroll();
  });

  clientSocket.setEvent('chat-log-resp', function(message) {
    console.log("chat-log-resp");
    $('#logManuscript').append('<p><span class="chat-message" title="' + message.from + '" style="color:blue; font-weight: bold;">' +
      new Date().toTimeString().split(" ")[0] + " " + message.from + ': </span>' + message.text + '</p>');
  });

  client.getChatUtil().on('client-log', function(message) {
    console.log("client-log");
    $('#logManuscript').append(message.from + ": " + message.text + "\n");
  });

  //Video Events -----------------------------------------------------------------
  clientSocket.setEvent("media-ready", function() {
    var mediaController = client.getMediaController();
    mediaController.initialize(new MediaSource(), window, true);
  });

  $('#meta-types').on("change", function (e) {
    console.log($(e.currentTarget.children.select).val());
    var mediaController = client.getMediaController();
    var trackInfo = mediaController.getTrackInfo();

    console.log(trackInfo);
    var typeId = $(e.currentTarget.children.select).val();
    var selectedTrack = trackInfo.get(typeId);

    console.log(selectedTrack);
    var vQuality = selectedTrack.video[0].index;
    var aQuality = selectedTrack.audio[0].index;

    var mediaController = client.getMediaController();
    mediaController.initialize(new MediaSource(), window, false, function() {
      mediaController.setActiveMetaData(typeId, vQuality, aQuality, null);
    });
  });

  $('#track-video').on("change", function (e) {
    console.log($(e.currentTarget.children.select).val());
    var mediaController = client.getMediaController();
    var trackInfo = mediaController.getTrackInfo();

    var typeId = $($('#meta-types').children()[0]).val();
    var selectedTrack = trackInfo.get(typeId);

    var vQuality = $(e.currentTarget.children.select).val();
    var aQuality = $($('#track-audio').children()[0]).val();

    mediaController.setActiveMetaData(typeId, vQuality, aQuality, null);
  });

  $('#track-audio').on("change", function (e) {
    console.log($(e.currentTarget.children.select).val());
    var mediaController = client.getMediaController();
    var trackInfo = mediaController.getTrackInfo();

    var typeId = $($('#meta-types').children()[0]).val();
    var selectedTrack = trackInfo.get(typeId);

    var vQuality = $($('#track-video').children()[0]).val();
    var aQuality = $(e.currentTarget.children.select).val();

    mediaController.setActiveMetaData(typeId, vQuality, aQuality, null);
  });

  $('#buffer-ahead').on("change", function (e) {
    var value = $(e.currentTarget.children[0]).val();
    var value = Math.trunc(value / 10);
    $(e.currentTarget.children[0]).val(value * 10);
    client.getMediaController().setBufferAhead(value);
  });

  $('#force-buffer').on("change", function (e) {
    var value = $(e.currentTarget.children[0]).is(':checked');
    client.getMediaController().setForceBuffer(value);
  });

  client.getMediaController().on('meta-data-loaded', function(trackInfo) {
    console.log('meta-data-loaded');

    var typeHtml = `<select name="select">`;
    var videoHtml = `<select name="select">`;
    var audioHtml = `<select name="select">`;
    var subtitleHtml = `<select name="select">`;

    var active = trackInfo.get('active');
    trackInfo.delete('active');

    var buildTrackHtml = function(tracks, type, activeIndex) {
      html = "";
      for(var i in tracks) {
        if(active.type === type && tracks[i].index === activeIndex) {
          html += `<option value="${tracks[i].index}" selected>${tracks[i].quality}</option>`;
        } else {
          html += `<option value="${tracks[i].index}">${tracks[i].quality}</option>`;
        }
      }
      return html;
    };

    for(var track of trackInfo) {
      var type = track[0];
      if(active !== null && active.type === type) {
        typeHtml += `<option value="${type}" selected>${type}</option>`;
      } else {
        typeHtml += `<option value="${type}">${type}</option>`;
      }
    }

    if(active !== null && active !== undefined) {
      videoHtml += buildTrackHtml(track[1].video, type, active.video);
      audioHtml += buildTrackHtml(track[1].audio, type, active.audio);
    }

    typeHtml += `</select">`;
    videoHtml += `</select>`;
    audioHtml += `</select>`;
    subtitleHtml += `</select>`;

    $('#meta-types').html(typeHtml);
    $('#track-video').html(videoHtml);
    $('#track-audio').html(audioHtml);
    $('#track-subs').html(subtitleHtml);
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
      }, 6000);
  }

  function hideUI() {
    $('.fadein').addClass("fadeout");
    $('.fadein').removeClass("fadein");
  }

  function showUI() {
    $('.fadeout').addClass("fadein");
    $('.fadeout').removeClass("fadeout");
  }
}
