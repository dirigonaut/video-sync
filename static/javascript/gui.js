function initGui(client, isAdmin) {
  var FADE_TIMER = 12000;

  $(window).onerror(function(e) {
    client.log.ui(e);
  });

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
  var togglePlay = function() {
    if ($('#video')[0].paused) {
      client.log.info(`Requesting ${client.keys.REQPLAY}`);
      client.socket.request(client.keys.REQPLAY);
    } else {
      client.log.info(`Requesting ${client.keys.REQPAUSE}`);
      client.socket.request(client.keys.REQPAUSE);
    }
  };

  $('#control-button-play').click(togglePlay);

  function updateProgressBar(e) {
    var video = $("#video")[0];
    var duration = video.duration;
    var current = video.currentTime;

    $('#currently-at').val((current / duration)*100);
    $('#progress-amount')[0].style.width = ((current/ duration)*100) + "%";

    for (var i = 0; i < video.buffered.length; ++i) {
      if (video.buffered.start(video.buffered.length - 1 - i) < video.currentTime) {
        $('#buffered-amount')[0].style.width = (video.buffered.end(video.buffered.length - 1 - i) / duration) * 100 + "%";
        break;
      }
    }

    $('#control-duration').val(toFormatted(duration));

    if(!$('#control-current').is(':focus')) {
      $('#control-current').val(toFormatted(current));
    }
  }

  var toFormatted = function(data) {
    if(typeof data === 'number') {
      var seconds = data.toFixed(0);
      var hour = Math.floor(seconds / 3600);
      var min = Math.floor((seconds - (hour * 3600)) / 60);
      sec = seconds % 60;

      return `${hour < 10 ? '0' + hour : hour}:${min < 10 ? '0' + min : min}:${sec < 10 ? '0' + sec : sec}`;
    }
  };

  var toSeconds = function(timestamp) {
    var timeArray = timestamp.split(':').reverse();
    var seconds = 0;

    for(var i in timeArray) {
      var temp = parseInt(timeArray[i], 10) * Math.pow(60, i);
      if(temp === temp) {
        seconds += temp;
      } else {
        seconds = NaN;
        break;
      }
    }

    return seconds;
  };

  $('#control-current').on('change', function(e) {
    var time = toSeconds($(e.currentTarget).val());

    if(time === time) {
      client.log.info(`Requesting ${client.keys.REQSEEK} at ${time}`);
      client.socket.request(client.keys.REQSEEK,
        client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.STATE, [time]));
    }
  });

  $('#currently-at').on('mouseup', function() {
    var percent = parseInt($('#currently-at').val());
    var length  = $('#video')[0].duration;
    var time = Math.round(length * (percent / 100));

    client.log.info(`Requesting ${client.keys.REQSEEK} at ${time}`);
    client.socket.request(client.keys.REQSEEK,
      client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.STATE, [time]));

    $("video").on("timeupdate", updateProgressBar);
  });

  $('#currently-at').on('mousedown', function() {
    $("video").off("timeupdate", updateProgressBar);
  });

  $('#control-button-full').click(function(e) {
    if(document.fullScreen || document.webkitIsFullScreen) {
      document.webkitExitFullscreen();
      $('.control-full').addClass("control");
      $('.control-full').removeClass("control-full");
      $('.flaticon-minus').addClass('flaticon-plus')
      $('.flaticon-plus').removeClass('flaticon-minus');
      toggleOverlays();
    } else {
      $(document).trigger('togglePanel', [true]);
      $('#fullscreen')[0].webkitRequestFullScreen();
      $('.control').addClass("control-full");
      $('.control').removeClass("control");
      $('.flaticon-plus').addClass('flaticon-minus')
      $('.flaticon-minus').removeClass('flaticon-plus');
      toggleOverlays();
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
  $("video").on("durationchange", updateProgressBar);

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
        client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.SPECIAL, [media]));
      $('#control-time-slider').val(0);
    });

    var scanDirs = function(e) {
      $('#path-dropdown').empty();
      client.socket.request(client.keys.GETCONTENTS,
        client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.STRING, [$('#path-input').val()]));
    };

    $('#path-input').on('keydown', function(e) {
      if([220, 191, 40, 13].includes(e.which)) {
        scanDirs();
      }
    });

    $('#path-input').click(scanDirs);
  }

  var joinFolders = function(dirs) {
    if(dirs || $('#path-input').val() === '') {
      dirs.forEach((value, index, array) => {
        $(`<div class="flex-element transparency invert">
          <div id='path-${index}' class="flex-element" onclick="$('#path-input').val('${value.replace(/\\/g, '\\\\')}')">${value}</div>
        </div>`).appendTo('#path-dropdown');
      });

      if($('#path-dropdown').is(":hidden")) {
        resetPathDropDown();
        toggleOverlays('path-dropdown');
      }
    } else {
      toggleOverlays();
    }
  };

  var resetPathDropDown = function() {
    $('.path-dropdown div').off();
    $('.path-dropdown div').click(function(e) {
      toggleOverlays();
    });

    $('.path-dropdown .invert').off();
    $('.path-dropdown .invert').hover(function(e) {
      $('.path-dropdown .invert').each((index, element) => {
        if(e.currentTarget == element) {
          $(element).toggleClass('show');
        } else {
          $(element).removeClass('show');
        }
      });
    });
  }

  client.formData.on(client.formData.Enums.FORMS.MEDIA_DIRS, joinFolders);

  //Token Events ----------------------------------------------------------------
  function initToken() {
    var loadTokens = function(tokens) {
      if(tokens) {
        removeTokensFromUI();

        for(var token in tokens) {
          $(`<form id="${token}" class="flex-element primary-color-invert margin">
            <div class="flex-h flex-center-h" id="${tokens[token].id ? tokens[token].id : token}">
              <a href="#" class="flex-v flex-center-v" onclick="$(document).trigger('token-level', [$(event.currentTarget).children()[0], $(event.currentTarget).parent().parent()]);">
                <span class="flex-icon ${token !== 'admin' ? 'invert' : ''} clear-spacers ${tokens[token].level === 'controls' ? 'flaticon-unlocked-2' : 'flaticon-locked-6'}"></span>
              </a>
              <div class="flex-v flex-element flex-center-v">
                <input type="text" class="flex-element ${tokens[token].handle ? 'toggle' : 'toggle show'}" value="${token}" /readonly>
                <input type="text" class="flex-element ${tokens[token].handle ? 'toggle show' : 'toggle'}" value="${tokens[token].handle}" /readonly>
                <input type="text" class="flex-element ${tokens[token].handle ? 'toggle show' : 'toggle'}"
                  ${tokens[token].id ? "id="+tokens[token].id+"-stats" : ""} /readonly>
              </div>
              <a href="#" class="flex-v flex-center-v" onclick="$(document).trigger('token-delete', $(event.currentTarget).parent().parent());">
                <span class="flex-icon ${token !== 'admin' ? 'invert' : ''} clear-spacers flaticon-error"></span>
              </a>
            </div>
          </form>`).prependTo('#token-list');
        }
      } else {
        client.log.warn(`${tokens} is not a valid list of tokens.`);
      }
    };

    client.formData.on(client.formData.Enums.FORMS.TOKENS, loadTokens);

    $('.lock').click(function(e) {
      $(document).trigger('lock-element', e.currentTarget);
    });

    $('#token-create').click(function() {
      client.log.info("Create Tokens.");
      var values = serializeForm('token-form', 'input');
      values.push($('#token-permissions').hasClass('flaticon-unlocked-2'));
      client.socket.request(client.keys.CREATETOKENS, client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.PAIR, values));
    });

    $(document).on('token-delete', function(e, element) {
      if(element) {
        if(element.id === "delete-tokens") {
          var removeAlltokens = function(confirm) {
            if(confirm) {
              client.socket.request(client.keys.DELETETOKENS,
                client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.SPECIAL, [getTokenValues()]));
            }
          }

          triggerConfirmation(removeAlltokens, "Are you sure you wish to delete all the tokens?");
        } else if(element.id !== 'admin') {
          client.socket.request(client.keys.DELETETOKENS,
            client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.SPECIAL, [[element.id]]));
        }
      }
    });

    var removeTokensFromUI = function() {
      $('#token-list > form').each((index, el) => {
        $(el).remove();
      });
    };

    var getTokenValues = function(skipUsed) {
      var ids = [];

      $('#token-list > form > div > div input:nth-child(1)').each((index, el) => {
        var id = $(el).val();
        if(id !== 'admin') {
          if(skipUsed) {
            var handle = $(el).parent().children().get(1);
            if(handle && $(handle).val() === "undefined") {
              ids.push(id);
            }
          } else {
            ids.push(id);
          }
        }
      });

      return ids;
    };

    $(document).on('token-level', function(e, element, form) {
      var tokens = [];

      if(element.id === "token-levels") {
        var ids = getTokenValues();
        var span = $(element).children()[0];
        var level = $(span).hasClass('flaticon-locked-6') ? 'controls' : 'none';
        $(span).hasClass('flaticon-locked-6')
          ? $(span).removeClass('flaticon-locked-6') && $(span).addClass('flaticon-unlocked-2')
          : $(span).removeClass('flaticon-unlocked-2') && $(span).addClass('flaticon-locked-6');

        for(let i in ids) {
          $(`#${ids[i]} > div > a:nth-child(1) > span`).each((index, el) => {
            if(ids[i] !== "admin") {
              tokens.push([ids[i], getLevel(el, level)]);
            }
          });
        }

        getLevel(span);
      } else {
        $("#token-list > form > div > a:nth-child(1) > span").each((index, el) => {
          if(el === element) {
            level = getLevel(el);
            tokens.push([$(form)[0].id, level]);
          }
        });
      }

      client.socket.request(client.keys.SETTOKENLEVEL,
        client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.SPECIAL, [tokens]));
    });

    var getLevel = function(el, level) {
      var value;

      if(!level && $(el).hasClass('flaticon-locked-6')) {
        value = 'controls';
      } else if(!level && $(el).hasClass('flaticon-unlocked-2')) {
        value = 'none';
      } else if(level) {
        value = level;
      }

      return value;
    };

    $('#token-copy').click(function(e) {
      var temp = $("<input>");
      $("body").append(temp);
      $(temp).val(getTokenValues(true));
      $(temp).select()
      document.execCommand("copy");
      $(temp).remove();
    });

    client.socket.request(client.keys.GETTOKENS);

    $('#token-permissions').click(function(e) {
      var ele = $(e.currentTarget);

      if(ele.hasClass('flaticon-unlocked-2')) {
        $(ele).removeClass('flaticon-unlocked-2');
        $(ele).addClass('flaticon-locked-6');
      } else {
        $(ele).removeClass('flaticon-locked-6');
        $(ele).addClass('flaticon-unlocked-2');
      }
    });

    var updateUserStats = function(response) {
      var stats = response.data;

      for(var i in stats) {
        var id = stats[i][0];
        var info = stats[i][1];
        info.time = toFormatted(info.timestamp);
        info.buffer = info.buffer ? 1 : 0;
        delete info.timestamp;
        $(`#${id}-stats`).val(JSON.stringify(info));
      }
    };

    client.socket.setEvent(client.keys.ADMINSTATS, updateUserStats);
  }

  //Side Events -----------------------------------------------------------------
  if(isAdmin) {
    $(`<div id="side-tokens" class="flex-icon transparency flex-center-v border-left">
      <a href="#"><span class="icon flaticon-user-3"></span></a>
    </div>`).insertAfter('#side-top');

    $(`<div id="side-shutdown" class="flex-icon transparency flex-center-v border-left">
      <a href="#"><span class="icon flaticon-power"></span></a>
    </div>`).insertAfter('#side-documentation');
  }

  $('.side .flex-icon').click(function(e) {
    var id = e.currentTarget.id.split('-')[1];

    if(id !== 'shutdown') {
      if(!$('.panel').hasClass('show')) {
        $(document).trigger('togglePanel');
      }

      $('.side > .flex-icon').each((index, element) => {
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
    }
  });

  //Log Events ------------------------------------------------------------------
  var logLevels = function() {
    var logs = client.logMan.Enums.LOGS;
    var levels = client.logMan.Enums.LEVELS;
    var cookieLevels = cookie.get('log-levels');

    for(let key in logs) {
      var level = cookieLevels && cookieLevels[key] ? cookieLevels[key] : undefined;

      $(`<div class="flex-h flex-center-h flex-element primary-color-invert margin">
          <div>${logs[key]}</div>
          <form id="log-${logs[key]}" class="flex-right">
            <select name="${logs[key]}">
              <option value=${levels.error}>Error</option>
              <option value=${levels.warn}>Warn</option>
              <option value=${levels.info} selected="selected">Info</option>
              <option value=${levels.debug}>Debug</option>
            </select>
          </form>
      </div>`).appendTo(`#log-levels`);
    }

    $('#log-levels > select').on('change', function(e) {
      var id = $(e.currentTarget).attr('name');
      var value = this.value;
      value = Object.keys(client.logMan.Enums.LEVELS)[value];
      client.logMan.setLevel(id, value);
    });
  }();

  var logDelete = function(e, element, key) {
    if(element === 'all') {
      $(`#${key}`).empty();
    } else {
      var parent = $(element).parent();
      $(parent).remove();

      if($(parent).attr('id') === 'notifications') {
        $(parent).removeClass('show')
      }
    }
  };

  $(document).on('log-delete', logDelete);

  var logging = function(message) {
    $(`<div class="flex-h flex-center-h flex-element primary-color-invert margin">
        <div type="text" class="flex-element clear-spacers force-text">
          ${message && message.time ? message.time : ''}
          ${message && message.data ? message.data : ''}
          ${message && message.meta ? JSON.stringify(message.meta) : ''}
        </div>
        <a href="#" class="flex-v flex-center-v" onclick="$(document).trigger('log-delete', event.currentTarget);">
          <span class="flex-icon flaticon-error flex-right invert"></span>
        </a>
      </div>`).prependTo(`#log-body-server`);
  };

  var notifyInterval;
  var notification = function(message) {
    if(notifyInterval) {
      window.clearInterval(notifyInterval);
      $(`#notification`).empty();
    }

    $(`<div class="flex-h flex-center-v padding rounded-corners borders">
      <div class="padding">
        ${message && message.time ? message.time : ''} ${message && message.data ? message.data : message}
      </div>
      <input id='notify-timer' type='hidden' value='10'>
      <a href="#" onclick="$(document).trigger('log-delete', event.currentTarget);">
        <span class="icon-min flaticon-error flex-right clear-spacers"></span>
      </a></div>`).appendTo(`#notification`);

    var selfDestruct = function() {
      var countDown = $('#notify-timer').val();
      countDown = parseInt(countDown);
      --countDown;

      if(countDown < 1) {
        $(`#notification`).empty();
        window.clearInterval(notifyInterval);
      } else {
        $('#notify-timer').val(countDown);
      }
    }

    notifyInterval = window.setInterval(selfDestruct, 1000);
    logging(message);
  };

  client.socket.setEvent(client.keys.SERVERLOG, logging);
  client.socket.setEvent(client.keys.NOTIFICATION, notification);

  //Video Overlay----------------------------------------------------------------
  $('#options-form select').on("change", function (e) {
    client.log.info($(e.currentTarget.children.select).val());
    var values = serializeForm('options-form', 'select');
    var video = $('video')[0];

    if(video.textTracks) {
      for(var i = 0; i < video.textTracks.length; ++i) {
        if(video.textTracks[i].label === values[2]) {
          video.textTracks[i].mode = 'showing';
        } else if(video.textTracks[i].mode !== "disabled") {
          video.textTracks[i].mode = 'hidden';
        }
      }
    }

    client.media.setActiveMetaData('webm', values[0], values[1]);
  });

  $('#buffer-options').on("change", function (e) {
    var value = $(e.currentTarget).val() ? $(e.currentTarget).val() : 8
    value = value > 16 ? Math.trunc(value / 4) : 4;
    $(e.currentTarget).val(value * 4);
    client.media.setBufferAhead(value);
  });

  if(isAdmin) {
    var changeSync = function (rawRange) {
      var range = parseFloat(rawRange);

      if(range === range) {
        cookie.set('sync-range', range, cookie.getExpiration.YEAR);
        client.socket.request(client.keys.SETSYNCRULE,
          client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.NUMBER, [range]));
      }
    };

    client.socket.setEvent(client.keys.SYNCRULE, function(range) {
      client.log.info(client.keys.SYNCRULE, range);

      if(typeof range === 'number' && range === range) {
        $('#sync-options').val(range);
      }
    });

    $('#sync-options').on("change", function(e) {
      changeSync($(e.currentTarget).val());
    });

    let range = cookie.get('sync-range');
    if(range && range !== '') {
      $('#sync-options').val(range);
    } else {
      $('#sync-options').val(2.5);
    }

    changeSync($('#sync-options').val());
  } else {
    $('#sync-options').parent().remove();
  }

  client.media.on('meta-data-loaded', function(trackInfo) {
    client.log.info('meta-data-loaded');
    $('#video-track-list').empty();
    $('#audio-track-list').empty();
    var active = trackInfo.get('active');
    trackInfo.delete('active');

    var webm = trackInfo ? trackInfo.get('webm') : undefined;
    for(let tracks in webm) {
      var options = '';

      for(let j = 0; j < webm[tracks].length; ++j) {
        options = `<option value="${webm[tracks][j].index}">
          ${webm[tracks][j].quality}</option>`;

        if(tracks === 'video') {
          $(options).appendTo('#video-track-list');
        } else if(tracks === 'audio') {
          $(options).appendTo('#audio-track-list');
        }
      }
    }
  });

  client.media.on('subtitle-loaded', function() {
    var subtitleHtml = `<option value="None" selected>None</option>`;

    var videoElement = $('video')[0];
    for(var i = 0; i < videoElement.textTracks.length; ++i) {
      if(videoElement.textTracks[i].mode !== "disabled") {
        subtitleHtml += `<option value="${videoElement.textTracks[i].label}">${videoElement.textTracks[i].label}</option>`;
      }
    }

    $('#subtitle-track-list').empty();
    $(subtitleHtml).appendTo('#subtitle-track-list');
  });

  //Sync Overlay ----------------------------------------------------------------
  $('#sync-syncing').click(function(e) {
    client.socket.request(client.keys.SYNCING);
  });

  var updateSyncInfo = function(data) {
    if(data) {
      if(data.foreGuard) {
        $('#sync-first').html(`~${(data.foreGuard).toFixed(0)}s`);
      }

      if(data.rearGuard) {
        $('#sync-last').html(`~${(data.rearGuard).toFixed(0)}s`);
      }

      if(data.difference) {
        $('#sync-diff').html(`~${(data.difference).toFixed(2)}s`);
      } else {
        $('#sync-diff').html(`~0s`);
      }
    }
  };

  client.socket.setEvent(client.keys.SYNCINFO, updateSyncInfo);

  //Utilities -------------------------------------------------------------------
  var serializeForm = function(element, type) {
    var values = [];
    $(`form#${element} ${type}`).each((index, element) => {
      values.push(element.value)
    });

    return values;
  };

  //Prevent form submitting by pressing Enter
  $('form input').on('keypress', function(e) {
    e.which === 13 ? e.preventDefault() : undefined;
  });

  $(document).on('keyup', function(e) {
    e.which === 32 ? togglePlay() : undefined;
  });

  $(document).on('webkitfullscreenchange', function(e) {
    if(!document.webkitIsFullScreen) {
      $('.flaticon-minus').addClass('flaticon-plus')
      $('.flaticon-plus').removeClass('flaticon-minus');
      $('.control-full').addClass("control");
      $('.control-full').removeClass("control-full");
      toggleOverlays();
    }
  });

  //CSS Animation ----------------------------------------------------------------
  var fadeOut, over;
  $('.media').on('mousemove', function(e) {
    if(!$('.fade').hasClass('show')) {
      $('.fade').toggleClass('show');
    }

    clearTimeout(fadeOut);
    if(!over) {
      fadeOut = setTimeout(() => {
        $('.fade').toggleClass('show');
      }, FADE_TIMER);
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
        var panelWidth = e.pageX / $(window).width()
        if(panelWidth > .25 && panelWidth < .75) {
          var padding = parseFloat($('.panel').css('padding')) * 2;
          changePanelWidth(e.pageX, padding);
          updateOverlays();
        }
      });
    }
  });

  $(window).resize(function(e) {
    var padding = parseFloat($('.panel').css('padding')) * 2;
    var width = $('.panel').outerWidth(true);
    if($('.panel').hasClass('show')) {
      changePanelWidth($(window).outerWidth(true) - width, padding);
      updateOverlays();
    }
  });

  client.socket.events.on(client.socket.Enums.EVENTS.ERROR, function() {
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

  if(isAdmin) {
    $('#path-input').click(function(e) {
      changeDropDown();
    });

    $('#path-input').on('input', function(e) {
      changeDropDown();
    });

    $('.path-dropdown .flex-h .flex-element').click(function(e) {
      $('#path-input').val($(e.currentTarget).text());
    });
  } else {
    $('#log-types').remove();
  }

  $('.video-element').click(function(e) {
    toggleOverlays();
  });

  $('#side-shutdown').click(function(e) {
    $(document).trigger('shutdown');
  });

  var changeOverlayPosition = function(parent, child, container) {
    if($(`.${child}`).hasClass('show')) {
      var parentPos = $(`#${parent}`).position();
      var parentOff = $(`#${parent}`).offset();
      var parentWid = $(`#${parent}`).outerWidth(true);
      var parentHie = $(`#${parent}`).outerHeight(true);

      var width     = $(`#${child}`).outerWidth(true);
      var height    = $(`.${child}`).hasClass('control-volume') ?  $(`#${child}`).outerWidth(true) /1.53 : $(`#${child}`).outerHeight(true);

      var left = parentOff.left - (width/2) + (parentWid/2);
      var top = parentOff.top - parentPos.top - height

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

  var changePanelWidth = function(x, padding) {
    var wWith =  $(window).width();
    var width1 = Math.max(Math.min(wWith - x, wWith), 0);
    var width2 = Math.max(Math.min(x, wWith), 0);


    $(`.panel`).attr('style', `width: ${width1}px;min-width:25%;padding:1%;`);
    $(`.media`).attr('style', `width: ${width2 - padding}px`);

    $(`.path-dropdown`).attr('style', `width: ${width2 - padding}px`);
    $(document).trigger('textarea-grow');
  };

  var changeDropDown = function() {
    var width = $(`#path-input`).width();
    var height = $(`.path`).height() + $(`.path`).offset().top;
    $(`.path-dropdown`).attr('style', `width: ${width}px;left:${$(`#path-input`).offset().left}px;top:${height}px;`);
  };

  var updateOverlays = function() {
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

  $(document).on('togglePanel', function(e, force) {
    $('.panel').removeAttr("style");
    $('.media').removeAttr("style");
    $('.side').removeAttr("style");

    if(force) {
      $('.panel').removeClass('show');
      $('.media').addClass('show');

      $('.side > .flex-icon').each((index, element) => {
        var elementId = element.id.split('-')[1];
        if(elementId) {
          $(`#panel-${elementId}`).removeClass('show');
        }
      });

      updateOverlays();
    } else {
      $('.panel').toggleClass('show');
      $('.media').toggleClass('show');
    }

    if($('.panel').hasClass('show')) {
      $(`.panel`).attr('style', `padding:1%;`);
    }

    updateOverlays();
  });

  $(document).on('lock-element', function(e, element) {
    if($(element).hasClass('flaticon-locked-6')) {
      $(element).removeClass('flaticon-locked-6');
      $(element).addClass('flaticon-unlocked-2');
    } else if($(element).hasClass('flaticon-unlocked-2')) {
      $(element).removeClass('flaticon-unlocked-2');
      $(element).addClass('flaticon-locked-6');
    }
  });

  $(document).on('textarea-grow', function(e) {
    $('textarea').each((index, ele) => {
      $(ele).height(1);
      $(ele).height(1 + $(ele).prop('scrollHeight'));
    });
  });

  if(isAdmin) {
    initMediaPath();
    initToken();
  } else {
    $('.is-admin').each((index, ele) => {
      $(ele).removeClass('show');
    });
  }
}
