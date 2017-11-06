function initGui(client, isAdmin) {
  //Setup -----------------------------------------------------------------------
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
      client.log.info('Reqesting server shutdown.');
      client.socket.request(client.keys.SHUTDOWN);
    });
  }

  //Controls Events -------------------------------------------------------------
  $('#control-button-play').click(function() {
    if ($('#video')[0].paused) {
      client.log.info(`Requesting ${client.keys.REQPLAY}`);
      client.socket.request(client.keys.REQPLAY);
    } else {
      client.log.info(`Requesting ${client.keys.REQPAUSE}`);
      client.socket.request(client.keys.REQPAUSE);
    }
  });

  function updateProgressBar(e) {
    $('.control-time-slider').val($("#video")[0].currentTime / $("#video")[0].duration * 100);
  }

  $('.control-time-slider').on('mouseup', function() {
    var percent = parseInt($('.control-time-slider').val());
    var length  = $('#video')[0].duration;
    var time = Math.round(length * (percent / 100));

    client.log.info(`Requesting ${client.keys.REQSEEK} at ${time}`);
    client.socket.request(client.keys.REQSEEK,
      client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.STATE, [time]));

    $("video").on("timeupdate", updateProgressBar);
  });

  $('.control-time-slider').on('mousedown', function() {
    $("video").off("timeupdate", updateProgressBar);
  });

  $('#control-button-full').click(function() {
    if(document.fullScreen || document.webkitIsFullScreen) {
      $('video')[0].webkitExitFullscreen();
      $('.control-full').addClass("control");
      $('.control-full').removeClass("control-full");
    } else {
      $('video')[0].webkitRequestFullScreen();
      $('.control').addClass("control-full");
      $('.control').removeClass("control");
    }
  });

  $('#video').on("pause", function (e) {
    $('.flaticon-pause-1').addClass('flaticon-play-button-1');
    $('.flaticon-pause-1').removeClass('flaticon-pause-1');
  });

  $('#video').on("play", function (e) {
    $('.flaticon-play-button-1').addClass('flaticon-pause-1');
    $('.flaticon-play-button-1').removeClass('flaticon-play-button-1');
  });

  $('video').on("timeupdate", updateProgressBar);

  $(".control-volume-slider").on("input change", function (e) {
    var range = parseInt($(".control-volume-slider").val()) * .01;
    $('#video')[0].volume = range;
  });

  //Media Path Events -----------------------------------------------------------
  function initMediaPath() {
    $('#path-button').click(function() {
      client.log.info("Load new video.");
      var media = $('#path-input').val();
      client.socket.request(client.keys.SETMEDIA,
        client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.PATH, [media]));
      $('#control-time-slider').val(0);
    });
  }

  //Token Events ----------------------------------------------------------------
  function initToken() {
    var loadTokens = function(tokens) {
      if(tokens) {
        $($('#token-body').find('form')).each((index, element) => {
          if(!$(element)[0].id) {
            $(element).remove();
          }
        });

        for(var token in tokens) {
          $(`<form class="flex-h flex-element">
            <a href="#" onclick="$(document).trigger('token-level', event.currentTarget);"">
              <span class="icon-min ${tokens[token].level === 'controls' ? 'flaticon-locked-3' : 'flaticon-locked'}"></span>
            </a>
            <input type="text" class="flex-element ${tokens[token].handle ? 'toggle' : 'toggle show'}" value="${token}" /readonly>
            <input type="text" class="flex-element ${tokens[token].handle ? 'toggle show' : 'toggle'}" value="${tokens[token].handle}" /readonly>
            <a href="#" onclick="$(document).trigger('token-delete', event.currentTarget);">
              <span class="icon-min flaticon-error"></span>
            </a>
          </form>`).appendTo('#token-body');
        }
      }
    };

    client.formData.on(client.formData.Enums.FORMS.TOKENS, loadTokens);

    $('#token-permissions').click(function(e) {
      var element = e.currentTarget;
      if($(element).hasClass('flaticon-locked-3')) {
        $(element).removeClass('flaticon-locked-3');
        $(element).addClass('flaticon-locked');
      } else if($(element).hasClass('flaticon-locked')) {
        $(element).removeClass('flaticon-locked');
        $(element).addClass('flaticon-locked-3');
      }
    });

    $('#token-create').click(function() {
      client.log.info("Create Tokens.");
      var values = serializeForm('token-form');
      values.push($('#token-permissions').hasClass('flaticon-locked-3'));

      client.socket.request(client.keys.CREATETOKENS, client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.PAIR, values));
    });

    $(document).on('token-delete', function(e, element) {
      var removeForms = function(form) {
        $($(form).children()).each((index, el) => {
          if($(el).is("input")) {
            var id = $(el).val();

            $(form).remove();
            client.socket.request(client.keys.DELETETOKENS,
              client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.SPECIAL, [id]));
          } else if ($(el).is("div")) {
            var removeAlltokens = function(confirm) {
              if(confirm) {
                $('#token-body form').each((index, element) => {
                  if(!$(element).attr('id')) {
                    removeForms(element);
                  }
                });
              }
            }

            triggerConfirmation(removeAlltokens, "Are you sure you wish to delete all the tokens?");
          }
        });
      }

      removeForms($(element).parent()[0]);
    });

    $(document).on('token-level', function(e, element) {
      var updateForms = function(form, override) {
        var level = override;

        $($(form).children()).each((index, el) => {
          if($(el).is("input")) {
            var id = $(el).val();

            client.socket.request(client.keys.SETTOKENLEVEL,
              client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.PAIR, [id, level]));
          } else if($(el).is("a")) {
            var child = $(el).children()[0];

            if(!level && child && $(child).hasClass('flaticon-locked-3')) {
              level = 'none';
              $(child).removeClass('flaticon-locked-3');
              $(child).addClass('flaticon-locked');
            } else if(!level && child && $(child).hasClass('flaticon-locked')) {
              level = 'controls';
              $(child).removeClass('flaticon-locked');
              $(child).addClass('flaticon-locked-3');
            }
          } else if ($(el).is("div")) {
            $('#token-body form').each((index, element) => {
              if(!$(element).attr('id')) {
                updateForms(element, level);
              }
            });
          }
        });
      }

      updateForms($(element).parent()[0]);
    });

    $('#token-copy').click(function(e) {
      var temp = $("<input>");
      $("body").append(temp);

      $('#token-body form').each((index, element) => {
        if(!$(element).attr('id')) {
          var id;

          $($(element).children()).each((index, el) => {
            if($(el).is("input")) {
              if(!id) {
                id = $(el).val();
              } else if($(el).val() !== 'undefined') {
                id = undefined;
              }
            }
          });

          if(id) {
            $(temp).val($(temp).val() ? `${$(temp).val()}, ${id}` : `${id}` );
          }
        }
      });

      $(temp).select()
      document.execCommand("copy");
      $(temp).remove();
    });
  }

  //Encode Events ---------------------------------------------------------------
  function initEncode() {
    $('#encode-input').on("focusout", function() {
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
        <button type="button" class="close toggle-icon-right" aria-label="Close"><span aria-hidden="true">&times;</span></button></td></tr>`);
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
        <button type="button" class="close toggle-icon-right" aria-label="Close"><span aria-hidden="true">&times;</span></button></td></tr>`);
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
        <button type="button" class="close toggle-icon-right" aria-label="Close"><span aria-hidden="true">&times;</span></button></td></tr>`);
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

    $('#submitEncoding').click(function(e) {
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
  $('.side .flex-icon').click(function(e) {
    var id = e.currentTarget.id.split('-')[1];
    if(!$(`.panel`).hasClass('show')) {
      $(document).trigger('togglePanel');
    }

    $('.side .flex-icon').each((index, element) => {
      var elementId = element.id.split('-')[1];

      if(id == elementId) {
        if($(`#panel-${elementId}`).hasClass('show')) {
          $(document).trigger('togglePanel');
        }

        $(`#panel-${elementId}`).toggleClass('show');
      } else {
        $(`#panel-${elementId}`).removeClass('show');
      }
    });
  });

  //Log Events ------------------------------------------------------------------
  client.socket.setEvent(client.keys.EVENTRESP, client.log.info);
  client.socket.setEvent(client.keys.PINGRESP, client.log.info);
  client.socket.setEvent(client.keys.LOGRESP, client.log.info);
  client.socket.setEvent(client.keys.INPUTERROR, client.log.error);

  //Video Events -----------------------------------------------------------------
  $('#options-video').on("change", function (e) {
    client.log.info($(e.currentTarget.children.select).val());
    var trackInfo = client.media.getTrackInfo();
    var selectedTrack = trackInfo.get('webm');

    var vQuality = $(e.currentTarget.children.select).val();
    var aQuality = $($('#track-audio').children()[0]).val();

    client.media.setActiveMetaData('webm', vQuality, aQuality, null);
  });

  $('#options-audio').on("change", function (e) {
    client.log.info($(e.currentTarget.children.select).val());
    var trackInfo = client.media.getTrackInfo();
    var selectedTrack = trackInfo.get('webm');

    var vQuality = $($('#track-video').children()[0]).val();
    var aQuality = $(e.currentTarget.children.select).val();

    client.media.setActiveMetaData('webm', vQuality, aQuality, null);
  });

  $('#options-subtitle').on("change", function (e) {
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

  $('#options-buffer').on("change", function (e) {
    var value = $(e.currentTarget.children[0]).val();
    var value = Math.trunc(value / 10);
    $(e.currentTarget.children[0]).val(value * 10);
    client.media.setBufferAhead(value);
  });

  $('#options-sync').on("change", function (e) {
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

  //Utilities --------------------------------------------------------------------
  var serializeForm = function(element) {
    var values = [];
    $($(`#${element}`).serializeArray()).each((index, element) => {
      values.push(element.value)
    });

    return values;
  };

  //CSS Animation ----------------------------------------------------------------
  var fadeOut, over;
  $('.container').on('mousemove', function(e) {
    if(!$('.fade').hasClass('show')) {
      $('.fade').toggleClass('show');
    }

    clearTimeout(fadeOut);
    if(!over) {
      fadeOut = setTimeout(() => {
        $('.fade').toggleClass('show');
      }, 6000);
    }
  });

  $('.fade').on('mouseover', function(e) {
    over = true;
    clearTimeout(fadeOut);
  });

  $('.fade').on('mouseout', function(e) {
    over = false;
  });

  $('.panel').mousedown(function(e) {
    $(document).off('mousemove');
    var border = parseInt($('.panel').css('borderLeftWidth'));

    if(e.offsetX <= border && $(e.target).hasClass('panel')) {
      e.originalEvent.preventDefault();
      $(document).on('mousemove', function(e) {
        changePanelWidth(e.pageX);
        updateOverlays();
      });
    }
  });

  client.socket.events.on(client.socket.Enums.EVENTS.ERROR, function() {
    $(document).trigger('togglePanel');
    toggleOverlays();
    $('.fade').removeClass('show');
  });

  $(document).mouseup(function(e) {
    $(document).off('mousemove');
  });

  $(window).resize(function() {
    updateOverlays();
  });

  $('#control-button-options').click(function(e) {
    toggleOverlays('control-options');
    changeOverlayPosition('control-button-options', 'control-options', 'media');
  });

  $('#control-button-volume').click(function(e) {
    toggleOverlays('control-volume');
    changeOverlayPosition('control-button-volume', 'control-volume', 'media');
  });

  $('#control-button-sync').click(function(e) {
    toggleOverlays('control-sync');
    changeOverlayPosition('control-button-sync', 'control-sync', 'media');
  });

  $('#path-input').click(function(e) {
    toggleOverlays('path-dropdown');
    changeDropDown();
  });

  $('.video').click(function(e) {
    toggleOverlays();
  });

  $('.invert').hover(function(e) {
    $('.invert').each((index, element) => {
      if(e.currentTarget == element) {
        $(element).toggleClass('show');
      } else {
        $(element).removeClass('show');
      }
    });
  });

  $('.path-dropdown .flex-h .flex-element').click(function(e) {
    $('#path-input').val($(e.currentTarget).text());
  });

  $('#shutdown-button').click(function(e) {
    $(document).trigger('shutdown');
  });

  var changeOverlayPosition = function(parent, child, container) {
    if($(`.${child}`).hasClass('show')) {
      var parentPos = $(`#${parent}`).position();
      var parentOff = $(`#${parent}`).offset();
      var parentWid = $(`#${parent}`).outerWidth(true);
      var parentHie = $(`#${parent}`).outerHeight(true);

      var position  = $(`#${child}`).position();
      var width     = $(`#${child}`).outerWidth(true);
      var height    = $(`#${child}`).outerHeight(true);

      var left = parentOff.left - (width/2) + (parentWid/2);
      var top = parentOff.top > (screen.height/2) ? parentOff.top - parentPos.top - height :
        parentOff.top + parentPos.top + parentHie;

      if(container) {
        var containerWid = $(`.${container}`).outerWidth(true);
        var containerHie = $(`.${container}`).outerHeight(true);

        if(parentPos.left + width/2 > containerWid) {
          left = containerWid - width;
        }
      }

      $(`#${child}`).attr('style', `left:${left}px;top:${top}px`);
    }
  };

  var changePanelWidth = function(x) {
    var wWith =  $(window).width();
    var width1 = Math.max(Math.min(wWith - x, wWith), 0);
    var width2 = Math.max(Math.min(x, wWith), 0);

    $(`.media`).attr('style', `width: ${width2}px`);
    $(`.panel`).attr('style', `width: ${width1}px;min-width:25%;padding:1%;`);
    $(`.path-dropdown`).attr('style', `width: ${width2}px`);
  };

  var changeDropDown = function() {
    var width = $(`#path-input`).outerWidth();
    var height = $(`.path`).height() + $(`.path`).offset().top;
    $(`.path-dropdown`).attr('style', `width: ${width}px;left:${$(`#path-input`).offset().left}px;top:${height}px;`);
  };

  var changeSidePosition = function() {
    if($('.panel').hasClass('show')) {
      var left = $('.panel').position().left - $('.side').width();
      $('.side').attr('style', `left:${left}px;`);
    }
  };

  var updateOverlays = function() {
    changeSidePosition();
    changeOverlayPosition('control-button-volume', 'control-volume', 'media');
    changeOverlayPosition('control-button-options', 'control-options', 'media');
    changeOverlayPosition('control-button-sync', 'control-sync', 'media');
    changeDropDown();
  };

  var toggleOverlays = function(overlay) {
    var overlays = ['control-options', 'control-volume',
                      'control-sync', 'path-dropdown'];

    for(let x = 0; x < overlays.length; ++x) {
      if(overlay === overlays[x]) {
        $(`#${overlay}`).toggleClass('show');
      } else {
        $(`#${overlays[x]}`).removeClass('show');
      }
    }
  };

  var triggerConfirmation = function(confirm, custom) {
    $("#confirm-no").trigger("click");
    $("#confirm-no").off();
    $("#confirm-yes").off();

    $('#confirm-no').one('click', function(e) {
      $('.confirm').removeClass('show');
      confirm(false);
    });

    $('#confirm-yes').one('click', function(e) {
      $('.confirm').removeClass('show');
      confirm(true);
    });

    if(custom) {
      $('.confirm-message').removeClass('show');
      $('#confirm-custom').html(custom);
      $('#confirm-custom').toggleClass('show');
    } else {
      $('.confirm-message').toggleClass('show');
    }

    $('.confirm').toggleClass('show');
  };

  client.socket.setEvent(client.keys.CONFIRM, function(message, callback) {
    triggerConfirmation(callback, message);
  });

  $(document).on('togglePanel', function() {
    $('.panel').removeAttr("style");
    $('.media').removeAttr("style");
    $('.side').removeAttr("style");

    $('.panel').toggleClass('show');
    $('.media').toggleClass('show');

    if($('.panel').hasClass('show')) {
      $(`.panel`).attr('style', `padding:1%;`);
    }

    updateOverlays();
  });

  if(isAdmin) {
    initMediaPath();
    initToken();
    initEncode();
  }

  client.log.ui("Gui initialized");
  function jqueryReset() {
    $(document).off('initializeMedia');
    $(document).off('togglePanel');
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
