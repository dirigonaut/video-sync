function initGUI(client, isAdmin) {
  //Control Bar Events ----------------------------------------------------------
  function updateProgressBar(e) {
    $('#seek-bar').val($("#video")[0].currentTime / $("#video")[0].duration * 100);
  }

  $('#btnPlay').click(function() {
    if ($('#video')[0].paused) {
      client.socket.request("state-req-play");
    } else {
      client.socket.request("state-req-pause");
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
    request.timestamp = Math.round(length * (percent / 100));
    client.socket.request('state-req-seek', request);

    $('#seek-bar').val(request.timestamp / $("#video")[0].duration * 100);
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
    client.log.info("Load new video.");
      var media = $('#locationBar').val();
      var request = {};
      request.data = media;
      client.socket.request("admin-set-media", request);
  });

  //Session Events --------------------------------------------------------------
  $('#createSession').click(function createSession() {
    var sender  = $('#sessionAddress').val();
    var to      = $('#sessionInvitees').val();
    var subject = $('#sessionSubject').val();
    var text    = $('#sessionText').val();

    var mailOptions = client.schema.createPopulatedSchema(client.schema.MAILOPTIONS, [sender, to, subject, text]);

    var id        = $('#sessionId').val();
    var title     = $('#sessionTitle').val();
    var address   = $('#sessionAddress').val();
    var invitees  = ($('#sessionInvitees').val()).split(",");

    if(!id) {
      client.socket.request("db-create-session",
        client.schema.createPopulatedSchema(client.schema.SESSION, [undefined, title, address, invitees, mailOptions]));
    } else {
      client.socket.request("db-update-session",
        client.schema.createPopulatedSchema(client.schema.SESSION, [id, title, address, invitees, mailOptions]));
    }
  });

  $('#readSessions').click(function readSessions() {
    client.socket.request("db-read-sessions");
  });

  $('#setSession').click(function setSession() {
    var request = {};
    request.data = $('#sessionId').val();
    client.socket.request("admin-load-session", request);
  });

  $('#sendInvitation').click(function readSessions() {
    client.socket.request("admin-smtp-invite");
  })

  $('#sessionList').on("click", "tr", function(e) {
      var id = e.currentTarget.children[0].outerText;
      var sessions = client.formData.getSessionList();
      var session;

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

      if(session) {
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
    var id = session[0].children[0].outerText;

    session.remove();

    client.socket.request("db-delete-session", id);
  });

  //Smtp Events -----------------------------------------------------------------
  $('#createContact').click(function createContact() {
    var handle  = $('#contactHandle').val();
    var address = $('#contactAddress').val();

    client.socket.request("db-create-contact",
      client.getRequestFactory().buildContactRequest(handle, address));
  });

  $('#createSmtp').click(function createSmtp() {
    var id        = $('#smtpId').val();
    var type      = $('#smtpType').val();
    var host      = $('#smtpHost').val();
    var address   = $('#smtpAddress').val();
    var password  = $('#smtpPassword').val();

    if(!id) {
      client.socket.request("db-create-smtp",
        client.schema.createPopulatedSchema(client.schema.SMTP, [undefined, type, host, address, password]));
    } else {
      client.socket.request("db-update-smtp",
        client.schema.createPopulatedSchema(client.schema.SMTP, [id, type, host, address, password]));
    }
  });

  $('#readContacts').click(function readContacts() {
    client.socket.request("db-read-contacts");
  });

  $('#readSmtps').click(function readSmtps() {
    client.socket.request("db-read-smtps");
  });

  $('#smtpList').on("click", "tr", function(e) {
      var id = e.currentTarget.children[0].outerText;
      var smtps = client.formData.getSmtpList();
      var smtp;

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

      if(smtp) {
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

    client.socket.request("db-delete-smtp", id);
  });

  //Encode Events ---------------------------------------------------------------
  $('#createEncoding').click(function createEncoding() {
    var input     = $('#encodeInput').val();
    var output    = $('#encodeOutput').val();
    var vQuality  = $("input[name=video-quality]:checked");
    var aQuality  = $("input[name=audio-quality]:checked");

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

    client.socket.request('video-encode', commands);
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
    var sessions = client.formData.getSessionList();

    if(sessions.length > 0) {
      if($("#sessionId").val() == '') {
        var session = sessions[0];

        if(session) {
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

  client.socket.setEvent("db-sessions", loadSessions);

  $('#btnSmtp').click(function() {
    loadSmtps();

    $('#smtpModal').modal('show');
    $('#smtpModal').on('shown', function() {
      $("#smtpType").focus();
    });
  });

  var loadSmtps = function() {
    var smtps = client.formData.getSmtpList();

    if(smtps.length > 0) {
      if($("#smtpId").val() == '') {
        var smtp = smtps[0];

        if(smtp) {
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

  client.socket.setEvent("db-smtps", loadSmtps);

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
    client.chatUtil.send(value);
  }

  function autoScroll(id) {
    if($(id).hasClass("auto-scroll")) {
      $(id).scrollTop($(id)[0].scrollHeight);
    }
  }

  $('#sendChat').click(sendChat);

  $('#chatMessage').keydown(function(event) {
    var keyId = event.keyCode || event.which;

    if (keyId === 13) {
      event.preventDefault();
      sendChat();
    }
  });

  var chatScrollTimeOut;
  $('#chatManuscript').on('scroll', function() {
    if(!chatScrollTimeOut) {
      chatScrollTimeOut = setTimeout(function(){
        clearTimeout(chatScrollTimeOut);
        chatScrollTimeOut = undefined;

        var element = $('#chatManuscript');
        var totalHeight = element.scrollTop() + element.innerHeight();
        if(totalHeight === element[0].scrollHeight) {
          element.addClass("auto-scroll");
        } else {
          element.removeClass("auto-scroll");
        }
      }, 250);
    }
  });

  var logScrollTimeOut;
  $('#logManuscript').on('scroll', function() {
    if(!logScrollTimeOut) {
      logScrollTimeOut = setTimeout(function(){
        clearTimeout(logScrollTimeOut);
        logScrollTimeOut = undefined;

        var element = $('#logManuscript');
        var totalHeight = element.scrollTop() + element.innerHeight();
        if(totalHeight === element[0].scrollHeight) {
          element.addClass("auto-scroll");
        } else {
          element.removeClass("auto-scroll");
        }
      }, 250);
    }
  });

  function systemMessage(message) {
    $('#chatManuscript').append(`<p><span class="chat-message" title="System" style="color:gray; font-weight: bold;">
      ${new Date().toTimeString().split(" ")[0]} System: </span>${client.chatUtil.getUserHandle(message.from)} ${message.data}</p>`);
    autoScroll('#chatManuscript');
  }

  function chatMessage(message) {
    $('#chatManuscript').append(`<p><span class="chat-message" title="${message.from}" style="color:blue; font-weight: bold;">
      ${new Date().toTimeString().split(" ")[0]} ${client.chatUtil.getUserHandle(message.from)}: </span>${message.data}</p>`);
    autoScroll('#chatManuscript');
  }

  function logMessage(message) {
    $('#logManuscript').append(`<p><span class="chat-message" title="${message.label}" style="color:blue; font-weight: bold;">
      ${message.time} ${message.level}: </span>${message.text} ${message.meta !== undefined ? message.meta : ""}</p>`);
      autoScroll('#logManuscript');
  }

  client.socket.setEvent('chat-broadcast-resp', chatMessage);
  client.socket.setEvent('chat-event-resp', systemMessage);
  client.socket.setEvent('chat-ping-resp', systemMessage);
  client.socket.setEvent('chat-log-resp', logMessage);

  //Video Events -----------------------------------------------------------------
  $('#meta-types').on("change", function (e) {
    client.log.info($(e.currentTarget.children.select).val());
    var trackInfo = client.media.getTrackInfo();

    client.log.info(trackInfo);
    var typeId = $(e.currentTarget.children.select).val();
    var selectedTrack = trackInfo.get(typeId);

    client.log.info(selectedTrack);
    var vQuality = selectedTrack.video[0].index;
    var aQuality = selectedTrack.audio[0].index;

    //need an emitter
  });

  $('#track-video').on("change", function (e) {
    client.log.info($(e.currentTarget.children.select).val());
    var trackInfo = client.media.getTrackInfo();

    var typeId = $($('#meta-types').children()[0]).val();
    var selectedTrack = trackInfo.get(typeId);

    var vQuality = $(e.currentTarget.children.select).val();
    var aQuality = $($('#track-audio').children()[0]).val();

    client.media.setActiveMetaData(typeId, vQuality, aQuality, null);
  });

  $('#track-audio').on("change", function (e) {
    client.log.info($(e.currentTarget.children.select).val());
    var trackInfo = client.media.getTrackInfo();

    var typeId = $($('#meta-types').children()[0]).val();
    var selectedTrack = trackInfo.get(typeId);

    var vQuality = $($('#track-video').children()[0]).val();
    var aQuality = $(e.currentTarget.children.select).val();

    client.media.setActiveMetaData(typeId, vQuality, aQuality, null);
  });

  $('#buffer-ahead').on("change", function (e) {
    var value = $(e.currentTarget.children[0]).val();
    var value = Math.trunc(value / 10);
    $(e.currentTarget.children[0]).val(value * 10);
    client.media.setBufferAhead(value);
  });

  $('#force-buffer').on("change", function (e) {
    var value = $(e.currentTarget.children[0]).is(':checked');
    client.media.setForceBuffer(value);
  });

  $('#synchronize').on("change", function (e) {
    var request = client.schema.createPopulatedSchema(client.schema.Enum.STRING, [$('#synchronize').find('input')[0].checked]);
    client.socket.request(client.keys.CHANGESYNC, request);
  });

  client.media.on('meta-data-loaded', function(trackInfo) {
    client.log.info('meta-data-loaded');

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

  client.log.ui("Gui initialized");
}
