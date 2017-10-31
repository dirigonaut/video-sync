function initGui(client, isAdmin) {
  //Setup -----------------------------------------------------------------------
  function initDom() {
    $(document).on('initializeMedia', function(e, reset) {
      var domElements = {
        mediaSource:  new MediaSource(),
        window:       window,
        document:     document,
        videoElement: document.getElementById('video')
      };

      client.media.initializeMedia(domElements, reset);
    });

    client.socket.setEvent(client.keys.MEDIAREADY, function() {
      $(document).trigger('initializeMedia');
    });

    if(isAdmin) {
      $(document).on('shutdown', function(e) {
        client.socket.setEvent(client.keys.CONFIRM, function(confirm) {
          confirm();
        });

        log.info('Reqesting server shutdown.');
        client.socket.request(client.keys.SHUTDOWN);
      });
    }
  }

  //Controls Events -------------------------------------------------------------
  function initControls() {
    $('#btnPlay').click(function() {
      if ($('#video')[0].paused) {
        client.log.info(`Requesting ${client.keys.REQPLAY}`);
        client.socket.request(client.keys.REQPLAY);
      } else {
        client.log.info(`Requesting ${client.keys.REQPAUSE}`);
        client.socket.request(client.keys.REQPAUSE);
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

    function updateProgressBar(e) {
      $('#seek-bar').val($("#video")[0].currentTime / $("#video")[0].duration * 100);
    }

    $('#seek-bar').on('mouseup', function() {
      var percent = parseInt($('#seek-bar').val());
      var length  = $('#video')[0].duration;
      var time = Math.round(length * (percent / 100));

      client.log.info(`Requesting ${client.keys.REQSEEK} at ${time}`);
      client.socket.request(client.keys.REQSEEK,
        client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.STATE, [time]));

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
  }

  //Media Path Events -----------------------------------------------------------
  function initMediaPath() {
    $('#btnSessionMedia').click(function() {
      client.log.info("Load new video.");
      var media = $('#locationBar').val();
      client.socket.request(client.keys.SETMEDIA,
        client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.PATH, [media]));
      $('#seek-bar').val(0);
    });
  }

  //Token Events ----------------------------------------------------------------
  function initToken() {
    var loadTokens = function(tokens) {
      if(tokens) {
        $('#tokenList').find("tr:gt(1)").remove();

        for(var token in tokens) {
          $('#tokenList tr:last').after(`<tr><td>${token}</td><td>${tokens[token].handle}</td><td><input type="checkbox" id='${token}' class="align-center"></td><td>
          <button type="button" class="close overlay-icon-right" aria-label="Close"><span aria-hidden="true">&times;</span></button></td></tr>`);

          if(tokens[token].level === 'controls') {
            $(`#${token}`).prop('checked', true);
          }
        }
      }
    };

    client.formData.on(client.formData.Enums.FORMS.TOKENS, loadTokens);

    $('#token-create').click(function() {
      client.log.info("Create Tokens.");
      var count = $('#token-count').val();
      var pem = $('#token-permissions').is(':checked');

      client.socket.request(client.keys.CREATETOKENS, client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.PAIR, [count, pem]));
    });

    $('#tokenList').on("click", "button", function(e) {
      var token = $($(e.currentTarget).parent()).parent();
      var id = token[0].children[0].outerText;

      if(id === 'Update') {
        var tokens = client.formData.getFormData(client.formData.Enums.FORMS.TOKENS);
        id = '';

        for(var token in tokens) {
          id = id ? `${id},${token}` : token;
        }

        $('#tokenList').find("tr:gt(1)").remove();
      } else if(!id.includes('Create Tokens')) {
        token.remove();
      }

      client.socket.request(client.keys.DELETETOKENS,
        client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.SPECIAL, [id]));
    });

    $('#tokenList').on("click", "input", function(e) {
      var token = $($(e.currentTarget).parent()).parent();
      var id    = token[0].children[0].outerText;
      var level = $(`#${id}`).is(':checked') ? 'controls' : 'none';

      if(id === 'Update') {
        var tokens = client.formData.getFormData(client.formData.Enums.FORMS.TOKENS);

        for(var token in tokens) {
          client.socket.request(client.keys.SETTOKENLEVEL,
            client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.PAIR, [token, level]));
        }
      } else if(!id.includes('Create Tokens')) {
        client.socket.request(client.keys.SETTOKENLEVEL,
          client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.PAIR, [id, level]));
      }
    });
  }

  //Encode Events ---------------------------------------------------------------
  function initEncode() {
    $('#encode-input').on("focusout", function requestFileInfo() {
      var input = $('#encode-input').val();
      var inspect = ` -show_streams ${input}`;
      client.socket.request(client.keys.GETMETA, client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.SPECIAL, [inspect]));
    });

    var loadFileInfo = function(metaData) {
      $('#toggles').append(toggle).empty();
      $('#file-info-panels').children('div').each(function(i, element) {
        if(element.id) {
          $(element).remove();
        }
      });

      if(metaData && typeof metaData.data !== 'undefined') {
        for(var i = 0; i < metaData.data.stream.length; ++i) {
          var toggle  = `<li role="presentation" ${i === 0 ? 'class="active"' : ''}><a href="#stream-${i}" aria-controls="stream-${i}" role="pill" data-toggle="pill">Stream-${i}</a></li>`
          var panel   = `<div role="tabpanel" class="tab-pane ${i === 0 ? 'active' : ''}" id="stream-${i}">
                          <textArea type="text" class="form-control" rows=8 placeholder="fileInfo">${metaData.data.stream[i]}</textarea></div>`;

          $('#file-info-panels').append(panel);
          $('#toggles').append(toggle);
        }
      }
    };

    client.socket.setEvent(client.keys.META, loadFileInfo);

    $('#createVideo').click(function createVideo() {
      var quality = $('#video-quality').val();
      var input = $('#encode-input').val();
      var output = $('#encode-output').val();

      var template = client.encode.getTemplate(client.encode.Enums.CODEC.WEBM, client.encode.Enums.TYPES.VIDEO);
      template = client.encode.setKeyValue('i', `${input}`, template);
      template = client.encode.setKeyValue('s', quality, template);
      template = client.encode.setOutput(`${output}${client.encode.getNameFromPath(input)}_${quality}.${client.encode.Enums.CODEC.WEBM}`, template);

      if(template) {
        $('#encode-list tr:last').after(`<tr><td>${client.encode.Enums.TYPES.VIDEO}</td><td contenteditable="true">${template}</td><td>
        <button type="button" class="close overlay-icon-right" aria-label="Close"><span aria-hidden="true">&times;</span></button></td></tr>`);
      }

      generateManifest();
    });

    $('#createAudio').click(function createAudio() {
      var quality = $('#audio-quality').val();
      var input = $('#encode-input').val();
      var output = $('#encode-output').val();

      var template = client.encode.getTemplate(client.encode.Enums.CODEC.WEBM, client.encode.Enums.TYPES.AUDIO);
      template = client.encode.setKeyValue('i', `${input}`, template);
      template = client.encode.setKeyValue('b:a', quality, template);
      template = client.encode.setOutput(`${output}${client.encode.getNameFromPath(input)}_${quality}.${client.encode.Enums.CODEC.WEBM}`, template);

      if(template) {
        $('#encode-list tr:last').after(`<tr><td>${client.encode.Enums.TYPES.AUDIO}</td><td contenteditable="true">${template}</td><td>
        <button type="button" class="close overlay-icon-right" aria-label="Close"><span aria-hidden="true">&times;</span></button></td></tr>`);
      }

      generateManifest();
    });

    $('#createSubtitle').click(function createSubtitle() {
      var streamId = $('#subtitle-track').val();
      var input = $('#encode-input').val();
      var output = $('#encode-output').val();
      var isNum = /^\d+$/.test(streamId);

      var template = client.encode.getTemplate(client.encode.Enums.CODEC.WEBM, client.encode.Enums.TYPES.SUBTITLE);
      template = client.encode.setKeyValue('i', `${input}${isNum ? ' -map 0:' + streamId : ''}`, template);
      template = client.encode.setOutput(`${output}${client.encode.getNameFromPath(input)}.vtt`, template);

      if(template) {
        $('#encode-list tr:last').after(`<tr><td>${client.encode.Enums.TYPES.SUBTITLE}</td><td contenteditable="true">${template}</td><td>
        <button type="button" class="close overlay-icon-right" aria-label="Close"><span aria-hidden="true">&times;</span></button></td></tr>`);
      }

      generateManifest();
    });

    $('#encode-list').on("click", "button", function(e) {
      var command = $($(e.currentTarget).parent()).parent();
      command.remove();
      generateManifest();
    });

    var generateManifest = function() {
      var input  = $('#encode-input').val();
      var output = $('#encode-output').val();
      var list = [];

      if(!$('#row_locked').is(":checked")) {
        $('#encode-list tr').each(function(i, tr) {
          var command = {};
          $('td', tr).each(function(i, td) {
            var cell = $(td).text();
            if(i === 0 && cell === client.encode.Enums.TYPES.MANIFEST) {
              command.type = cell;
              tr.remove();
            } else if(i === 0 && cell) {
              command.type = cell;
            } else if(i === 1 && cell) {
              command.input = cell;
            }
          });

          if(typeof command.input !== 'undefined' && command.type !== client.encode.Enums.TYPES.MANIFEST &&
            command.type !== client.encode.Enums.TYPES.SUBTITLE) {
            list.push(command);
          }
        });

        if(list.length > 0) {
          var template = client.encode.createManifest(input, output, list, client.encode.Enums.CODEC.WEBM);

          if(template) {
            $('#encode-list tr:last').after(`<tr><td>${client.encode.Enums.TYPES.MANIFEST}</td><td contenteditable="true">${template}</td><td>
            <input type="checkbox" id="row_locked" name="locked"></td></tr>`);
          }
        }
      }
    }

    $('#submitEncoding').click(function submitEncoding() {
      var output = $('#encode-output').val();
      var commands = [];

      $('#encode-list tr').each(function(i, tr) {
        $('td', tr).each(function(i, td) {
          var cell = $(td).text();
          if(i === 1 && cell) {
            commands.push({input: cell, encoder: client.encode.Enums.ENCODER.FFMPEG});
          }
        });
      });

      var request = {};
      request.encodings = commands;
      request.directory = output;

      client.socket.request('video-encode', request);
    });
  }

  //Side Events -----------------------------------------------------------------
  function initSide() {
    if(isAdmin) {
      $('#btnTokens').click(function() {
        $('#tokenModal').modal('show');
      });

      $('#btnEncode').click(function() {
        $('#encodeModal').modal('show');
        $('#encodeModal').on('shown', function() {
          $("#encodeInput").focus();
        });
      });
    }

    $('#btnHelp').click(function() {
      $('#helpModal').modal('show');
    });
  }

  //Log Events ------------------------------------------------------------------
  function initLog() {
    client.socket.setEvent(client.keys.EVENTRESP, client.log.info);
    client.socket.setEvent(client.keys.PINGRESP, client.log.info);
    client.socket.setEvent(client.keys.LOGRESP, client.log.info);
    client.socket.setEvent(client.keys.INPUTERROR, client.log.error);
  }

  //Video Events -----------------------------------------------------------------
  function initVideo() {
    $('#meta-types').on("change", function (e) {
      client.log.info($(e.currentTarget.children.select).val());
      var trackInfo = client.media.getTrackInfo();

      client.log.info(trackInfo);
      var typeId = $(e.currentTarget.children.select).val();
      var selectedTrack = trackInfo.get(typeId);

      client.log.info(selectedTrack);
      var vQuality = selectedTrack.video[0].index;
      var aQuality = selectedTrack.audio[0].index;
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

    $('#track-subtitle').on("change", function (e) {
      client.log.info($(e.currentTarget.children.select).val());
      var selected = $(e.currentTarget.children.select).val();

      var videoElement = $('video')[0];
      for(var i = 0; i < videoElement.textTracks.length; ++i) {
        if(videoElement.textTracks[i].label === selected) {
          videoElement.textTracks[i].mode = 'showing';
        } else if(videoElement.textTracks[i].mode !== "disabled") {
          videoElement.textTracks[i].mode = 'hidden';
        }
      }
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

      subtitleHtml += `<option value="None" selected>None</option>`;

      typeHtml += `</select">`;
      videoHtml += `</select>`;
      audioHtml += `</select>`;
      subtitleHtml += `</select>`;

      $('#meta-types').html(typeHtml);
      $('#track-video').html(videoHtml);
      $('#track-audio').html(audioHtml);
      $('#track-subs').html(subtitleHtml);
    });

    client.media.on('subtitle-loaded', function() {
      var subtitleHtml = `<select name="select"> <option value="None" selected>None</option>`;

      var videoElement = $('video')[0];
      for(var i = 0; i < videoElement.textTracks.length; ++i) {
        if(videoElement.textTracks[i].mode !== "disabled") {
          subtitleHtml += `<option value="${videoElement.textTracks[i].label}">${videoElement.textTracks[i].label}</option>`;
        }
      }

      subtitleHtml += `</select>`;
      $('#track-subtitle').html(subtitleHtml);
    });
  }

  //CSS Animation ----------------------------------------------------------------
  function initAnimations() {
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

    $('#side-container').on('click', function() {
      console.log('woot')
      $('#panel-container').toggleClass('show');
      $('#media-container').toggleClass('show');
      $('#side-container').toggleClass('show');
    });
  }


  jqueryReset();
  initDom();
  initControls();
  initSide();
  initLog();
  initVideo();
  initAnimations();

  if(isAdmin) {
    initMediaPath();
    initToken();
    initEncode();
  }

  client.log.ui("Gui initialized");
  function jqueryReset() {
    $(document).off('initializeMedia');
    $(document).off('shutdown');

    $('#btnPlay').off();
    $('#btnMute').off();
    $('#seek-bar').off();
    $("video").off();
    $('#btnFullScreen').off();
    $("#volume-bar").off();
    $("#btnOptions").off();
    $('#btnSessionMedia').off();
    $('#token-create').off();
    $('#tokenList').off();
    $('#encode-input').off();
    $('#createVideo').off();
    $('#createAudio').off();
    $('#createSubtitle').off();
    $('#encode-list').off();
    $('#submitEncoding').off();
    $('#btnTokens').off();
    $('#btnEncode').off();
    $('#btnHelp').off();
    $('#meta-types').off();
    $('#track-video').off();
    $('#track-audio').off();
    $('#track-subtitle').off();
    $('#buffer-ahead').off();
    $('#force-buffer').off();
    $('.container').off();
  }
}
