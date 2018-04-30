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
    client.media.on('bufferError', function(reset) {
      //$(document).trigger('initializeMedia', client.media.isMediaInitialized());
    });
  });

  client.socket.setEvent(client.keys.MEDIAREADY, function() {
    var path = $('#path-input').val();
    var paths = cookie.get('media-paths');
    paths = paths ? paths.split(',') : [];

    if(!paths.includes(path) && path !== '') {
      paths.push(path);
      cookie.set('media-paths', paths, cookie.getExpiration.YEAR);
    }

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
    $('.control-time-slider').val($("#video")[0].currentTime / $("#video")[0].duration * 100);
    $('#control-duration').val(toFormatted($("#video")[0].duration));

    if(!$('#control-current').is(':focus')) {
      $('#control-current').val(toFormatted($("#video")[0].currentTime));
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
      $('#video-container')[0].webkitRequestFullScreen();
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
    $('#volume-level').text(Math.floor(range * 100));
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

    $('#path-input').click(function() {
      $('#path-dropdown').empty();
      var paths = cookie.get('media-paths');
      client.socket.request(client.keys.GETCONTENTS,
        client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.STRING, ['mediaDir']));

      if(paths) {
        paths = paths ? paths.split(',') : [];

        paths.forEach((value, index, array) => {
          $(`<div class="flex-h flex-element primary-color invert">
            <div id='path-${index}' class="flex-element" onclick="$('#path-input').val('${value.replace(/\\/g, '\\\\')}')">${value}</div>
            <a href="#" onclick="$(document).trigger('path-delete', $('#path-${index}'));">
              <span class="icon-min flex-icon flaticon-error"></span>
            </a>
          </div>`).prependTo('#path-dropdown');
        });

        resetPathDropDown();
      }
    });
  }

  var joinFolders = function(dirs) {
    if(dirs) {
      dirs.forEach((value, index, array) => {
        $(`<div class="flex-h flex-element primary-color invert">
          <div id='path-${index}' class="flex-element" onclick="$('#path-input').val('${value.replace(/\\/g, '\\\\')}')">${value}</div>
        </div>`).appendTo('#path-dropdown');
      });

      resetPathDropDown();
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

  $(document).on('path-delete', function(e, element) {
    var paths = cookie.get('media-paths').split(',');

    if(paths) {
      var index = paths.indexOf($(element).text());
      if(index !== -1) {
        $(element).parent().remove();
        paths.splice(index, 1);
        cookie.set('media-paths', paths, cookie.getExpiration.YEAR);
      }
    }
  });

  //Token Events ----------------------------------------------------------------
  function initToken() {
    var loadTokens = function(tokens) {
      if(tokens) {
        $($('#token-body').find('form')).each((index, element) => {
          if(!$(element)[0].id) {
            $(element).remove();
          }
        });

        var i = 0;
        for(var token in tokens) {
          $(`<form class="flex-h flex-element alternate-color">
            <a href="#" class='flex-icon' onclick="$(document).trigger('token-level', event.currentTarget);">
              <span class="${i % 2 ? 'icon-min' : 'icon-min show'} ${tokens[token].level === 'controls' ? 'flaticon-unlocked-2' : 'flaticon-locked-6'}"></span>
            </a>
            <input type="text" class="flex-element ${tokens[token].handle ? 'toggle' : 'toggle show'} ${i % 2 ? '' : 'input-invert'}" value="${token}" /readonly>
            <input type="text" class="flex-element handle ${tokens[token].handle ? 'toggle show' : 'toggle'} ${i % 2 ? '' : 'input-invert'}" value="${tokens[token].handle}" /readonly>
            <a href="#" onclick="$(document).trigger('token-delete', event.currentTarget);">
              <span class="flex-icon ${i % 2 ? 'icon-min' : 'icon-min show'} flaticon-error"></span>
            </a>
          </form>`).appendTo('#token-body');
          ++i;
        }
      } else {
        client.log.error(`${tokens} is not a valid list of tokens.`);
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
      var ids = '';

      var removeForms = function(form) {
        $($(form).children()).each((index, el) => {
          if($(el).is("input") && !$(el).hasClass("handle")) {
            ids = ids ? `${ids}, ${$(el).val()}` : $(el).val();
            $(form).remove();
          } else if ($(el).is("div")) {
            var removeAlltokens = function(confirm) {
              if(confirm) {
                $('#token-body form').each((index, element) => {
                  if(!$(element).attr('id')) {
                    removeForms(element);
                  }
                });

                client.socket.request(client.keys.DELETETOKENS,
                  client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.SPECIAL, [ids]));
              }
            }

            triggerConfirmation(removeAlltokens, "Are you sure you wish to delete all the tokens?");
          }
        });
      };

      removeForms($(element).parent()[0]);
      if(ids) {
        client.socket.request(client.keys.DELETETOKENS,
          client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.SPECIAL, [ids]));
      }
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

            if(!level && child && $(child).hasClass('flaticon-locked-6')) {
              level = 'controls';
              $(child).removeClass('flaticon-locked-6');
              $(child).addClass('flaticon-unlocked-2');
            } else if(!level && child && $(child).hasClass('flaticon-unlocked-2')) {
              level = 'none';
              $(child).removeClass('flaticon-unlocked-2');
              $(child).addClass('flaticon-locked-6');
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
  }

  //Encode Events ---------------------------------------------------------------
  function initEncode() {
    $('#encode-input').on("focusin", function() {
      client.socket.request(client.keys.GETCONTENTS,
        client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.STRING, ['encodeDir']));
    });

    $('#encode-input').on("focusout", function() {
      var input = encodeURI($('#encode-input').val());
      var inspect = ` -show_streams ${input}`;

      var request = {};
      request.encodings = inspect;

      client.socket.request(client.keys.GETMETA, request);
    });

    var joinFiles = function(files) {
      $('#encode-files').empty();

      if(files) {
        files.forEach((value, index, array) => {
          $(`<option value="${value}">`).appendTo('#encode-files');
        });
      }
    };

    client.formData.on(client.formData.Enums.FORMS.ENCODE_DIRS, joinFiles);

    var loadFileInfo = function(metaData) {
      $('#encoding-meta').children().each((index, el) => {
        if($(el)[0].id === "encoding-tabs") {
          $($(el).children()).each(function(index, child) {
            if($($(child)[0]).is("a")) {
              $(child).remove();
            }
          });
        } else {
          $(el).remove();
        }
      });

      $('#subtitle-track').empty();

      if(metaData && typeof metaData.data !== 'undefined') {
        var trackIndexes = '';

        for(var i = metaData.data.stream.length - 1; i > -1; --i) {
          $(`<div id='stream-${i}' class="panel-sub-panel flex-element ${i === 0 ? 'toggle show' : 'toggle'}">
            ${prettifyMeta(JSON.stringify(metaData.data.stream[i]))}
          </div>`).appendTo('#encoding-meta');

          $(`<a href="#" onclick="$(document).trigger('encode-meta-toggle', ${i})";>
              <span id='stream-icon-${i}' class='icon-min flex-icon flex-right ${ i === 0 ? "flaticon-file-2" : "flaticon-file-1" }'></span>
            </a>`).appendTo('#encoding-tabs');

          trackIndexes = `<option value="${i}">` + trackIndexes;
        }

        $(trackIndexes).appendTo('#subtitle-track');
      }
    };

    var prettifyMeta = function(meta) {
      meta = meta.replace(/(\[STREAM\]|\[\\STREAM\]|\{|\}|")*/g, '');
      var metaArray = meta.split(',');
      var html = '<table><tbody>';

      for(let i = 0; i < metaArray.length; ++i) {
        var value = metaArray[i].trim();

        if(value) {
          var splitRow = value.split(/\s/)
          html += `<tr><td>${splitRow[0]}</td><td>${splitRow[1]}</td></tr>`
        }
      }

      html+="</tbody></table>";
      return html;
    }

    $(document).on('encode-meta-toggle', function(event, index) {
      $('[id^=stream-]').each((i, el) => {
        $(el).removeClass("show");

        if($(`#stream-icon-${i}`).hasClass('flaticon-file-2')) {
          $(`#stream-icon-${i}`).removeClass('flaticon-file-2');
          $(`#stream-icon-${i}`).addClass('flaticon-file-1');
        }
      });

      $(`#stream-${index}`).toggleClass("show");
      $(`#stream-icon-${index}`).addClass('flaticon-file-2');
    });

    client.socket.setEvent(client.keys.META, loadFileInfo);

    $('#encode-input-form a').click(function(e) {
      var values = serializeForm('encode-input-form', 'input');
      values.splice(2, 0, serializeForm('encode-input-form', 'select').pop());
      var type;

      $($(e.currentTarget).parent()).children().each((index, ele) => {
        if($(ele).is("label")) {
          type = $(ele).html().toUpperCase().match(/^\w*/g)[0];
        }
      });

      var template = client.encode.getTemplate(client.encode.Enums.CODEC.WEBM, type);
      template = client.encode.setKeyValue('i', encodeURI(`${values[0]}`), template);

      if(type === client.encode.Enums.TYPES.VIDEO) {
        template = client.encode.setKeyValue('speed', values[2], template);
        template = client.encode.setKeyValue('b:v', values[3], template);
        template = client.encode.setKeyValue('s', values[4], template);
        template = client.encode.setOutput(encodeURI(`${values[1]}${client.encode.getNameFromPath(values[0])}_${values[4]}.${client.encode.Enums.CODEC.WEBM}`), template);
      } else if(type === client.encode.Enums.TYPES.AUDIO) {
        template = client.encode.setKeyValue('b:a', values[5], template);
        template = client.encode.setOutput(encodeURI(`${values[1]}${client.encode.getNameFromPath(values[0])}_${values[5]}.${client.encode.Enums.CODEC.WEBM}`), template);
      } else if(type === client.encode.Enums.TYPES.SUBTITLE) {
        template = client.encode.setKeyValue('i', `${values[0]} ${values[6] ? `-map 0:${values[6]}` : ''}`, template);
        template = client.encode.setOutput(encodeURI(`${values[1]}${client.encode.getNameFromPath(values[0])}.vtt`), template);
      }

      if(template) {
        var odd = $(`#${type.toLowerCase()}-commands`).children().length % 2;
        $(`<div class="flex-h ${odd ? 'input-invert' : ''} rounded-corners">
          <textarea type="text" class="flex-element ${odd ? 'input-invert' : ''} clear-spacers">${template}</textarea>
          <a href="#" onclick="$(document).trigger('encode-command-delete', event.currentTarget);">
            <span class="flex-icon icon-min ${odd ? 'icon-min show' : 'icon-min'} flaticon-error flex-right"></span>
          </a></div>`).appendTo(`#${type.toLowerCase()}-commands`);
      }

      generateManifest();
    });

    $(document).on('encode-command-delete', function(e, element, skipGen) {
      $($(element).parent()).remove();

      if(!skipGen) {
        generateManifest();
      }
    });

    var generateManifest = function() {
      var values = serializeForm('encode-input-form', 'input');
      var commands = [];

      serializeForm('encode-command-form #video-commands', 'textarea')
      .forEach((value, index, array) => {
        commands.push({ type: client.encode.Enums.TYPES.VIDEO, input: value});
      });

      serializeForm('encode-command-form #audio-commands', 'textarea')
      .forEach((value, index, array) => {
        commands.push({ type: client.encode.Enums.TYPES.AUDIO, input: value});
      });

      var template = client.encode.createManifest(values[0], values[1], commands, client.encode.Enums.CODEC.WEBM);

      var locked = $('#manifest-commands div a span');
      locked = locked && locked.length > 0 ? locked = $(locked[0]).hasClass('flaticon-locked-6') : false;

      if(!locked) {
        $(`#manifest-commands`).empty();

        if(template && commands && commands.length > 0) {
          $(`<div class="flex-h">
            <textarea type="text" class="flex-element clear-spacers">${template}</textarea>
            <div class="flex-v">
              <a href="#" onclick="$(document).trigger('lock-element', $('#manifest-commands div a span')[0]);">
                <span class="icon-min ${!locked ? 'flaticon-unlocked-2' : 'flaticon-locked-6'} flex-right clear-spacers lock"></span>
              </a>
              <a href="#" onclick="$(document).trigger('encode-command-delete', [$(event.currentTarget).parent(), true]);">
                <span class="icon-min flaticon-error flex-right clear-spacers"></span>
              </a>
            </div></div>`).appendTo(`#manifest-commands`);
        }
      }

      $(document).trigger('textarea-grow');
    }

    $('#submit-encoding').click(function(e) {
      var values = serializeForm('encode-input-form', 'input');
      var commands = [];

      serializeForm('encode-command-form', 'textarea')
      .forEach((value, index, array) => {
        commands.push({ input: value, encoder: client.encode.Enums.ENCODER.FFMPEG });
      });

      var request = {};
      request.encodings = commands;
      request.directory = values[1];

      client.log.info('video-encode', request);
      client.socket.request('video-encode', request);
    });
  }

  //Side Events -----------------------------------------------------------------
  if(isAdmin) {
    $(`<div id="side-tokens" class="flex-icon primary-color flex-center-v border-left">
      <a href="#"><span class="icon flaticon-user-3"></span></a>
    </div>
    <div id="side-encode" class="flex-icon primary-color flex-center-v border-left">
      <a href="#"><span class="icon flaticon-compose"></span></a>
    </div>`).prependTo('#side');

    $(`<div id="side-shutdown" class="flex-icon primary-color flex-center-v border-left">
      <a href="#"><span class="icon flaticon-power"></span></a>
    </div>`).insertAfter('#side-documentation');
  }

  $('.side .flex-icon').click(function(e) {
    var id = e.currentTarget.id.split('-')[1];

    if(id !== 'shutdown') {
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
    }
  });

  //Log Events ------------------------------------------------------------------
  var logLevels = function() {
    var logs = client.logMan.Enums.LOGS;
    var levels = client.logMan.Enums.LEVELS;
    var cookieLevels = cookie.get('log-levels');

    for(let key in logs) {
      var level = cookieLevels && cookieLevels[key] ? cookieLevels[key] : undefined;

      $(`<div class="flex-h flex-element alternate-color">
        <label>${logs[key]}:</label>
        <form id="log-${logs[key]}" class="flex-right">
          <input name="${logs[key]}" type="radio" ${level && level.includes("error") ? 'checked' : ''} value="${levels.error}">
          <input name="${logs[key]}" type="radio" ${level && level.includes("warn") ? 'checked' : ''} value="${levels.warn}">
          <input name="${logs[key]}" type="radio" ${level && !level.includes("info") ? '' : 'checked'} value="${levels.info}">
          <input name="${logs[key]}" type="radio" ${level && level.includes("verbose") ? 'checked' : ''} value="${levels.verbose}">
          <input name="${logs[key]}" type="radio" ${level && level.includes("debug") ? 'checked' : ''} value="${levels.debug}">
          <input name="${logs[key]}" type="radio" ${level && level.includes("silly") ? 'checked' : ''} value="${levels.silly}">
        </form>
      </div>`).appendTo(`#log-levels`);
    }

    $('#log-levels input').on('change', function(e) {
      var id = $(e.currentTarget).attr('name');
      var value = $(e.currentTarget).val();
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

  $(document).on('encode-delete', function(e, ele, id) {
    if($(`#encode-complete-${id}`).val() === 'true') {
      logDelete(e, ele);
    } else {
      client.socket.request(client.keys.CANCELENCODE,
        client.schema.createPopulatedSchema(client.schema.Enums.SCHEMAS.STRING, [id]));
    }
  });

  var loggingOdd = 0;
  var logging = function(message) {
    $(`<div class="flex-h ${loggingOdd % 2 ? '' : 'input-invert'} flex-element">
      <div type="text" class="flex-element clear-spacers force-text">
        ${message && message.time ? message.time : ''} ${message && message.data ? message.data : message}
      </div>
      <a href="#" onclick="$(document).trigger('log-delete', event.currentTarget);">
        <span class="flex-icon ${loggingOdd % 2 ? 'icon-min' : 'icon-min show'} flaticon-error flex-right"></span>
      </a></div>`).prependTo(`#log-body-server`);
      loggingOdd = (loggingOdd + 1) % 2;
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

  var durRegex=/(Duration:\s)(\d{2,}:)+(\d{2,})(.\d{2,})/g;
  var timeRegex=/(time=)(\d{2,}:)+(\d{2,})(.\d{2,})/g;
  var progressOdd = 0;
  var progress = function(message) {
    if(message.label) {
      $(`<div class="flex-h flex-element flex-center-v rounded-corners ${progressOdd % 2 ? '' : 'input-invert'}">
          <label>${message && message.time ? message.time.split(' ')[0] : ''}</label>
          <p class="clear-spacers force-text">${message && message.data ? message.data : message}</p>
        </div>`).prependTo(`#encoding-body-${message.label}`);

      if(message.data.includes('Server: Succesfully')) {
        $(`#time-${message.label}`).text('Finished');
        $(`#encode-complete-${message.label}`).val('true');
      } else if (message.data.includes('Server: Failed')) {
        $(`#time-${message.label}`).text('Failed');
        $(`#encode-complete-${message.label}`).val('true');
      }

      var dur = durRegex.exec(message.data);
      if(dur) {
        $(`#duration-${message.label}`).text(dur[0].split(' ')[1]);
      }

      var time = timeRegex.exec(message.data);
      if(time) {
        $(`#time-${message.label}`).text(time[0].split('=')[1]);
      }

      progressOdd = (progressOdd + 1) % 2;
    }
  };

  var encodingsOdd = 0;
  var loadEncodings = function(encodings) {
    encodings.data.forEach((value, index) => {
      if(!$(`#encoding-${value[0]}`).length) {
        $(`<div id="encoding-${value[0]}" class="flex-v ${encodingsOdd % 2 ? 'even-color' : ''} padding rounded-corners">
          <div class="flex-h">
            <div type="text" class="flex-element clear-spacers force-text" onclick="$('#encoding-body-${value[0]}').toggleClass('show')">
              <p class="clear-spacers">${value[1] && Array.isArray(value[1]) ? value[1].pop() : value[1]}</p>
              <div class="flex-h">
                <div id="time-${value[0]}"></div>
                <div id="duration-${value[0]}" class="flex-right"></div>
              </div>
            </div>
            <input id='encode-complete-${value[0]}' type='hidden' value='false'>
            <a href="#" onclick="$(document).trigger('encode-delete', [$(event.currentTarget).parent(), '${value[0]}']);">
              <span class="icon-min flaticon-error flex-right clear-spacers ${encodingsOdd % 2 ? 'show' : ''}"></span>
            </a>
          </div>
          <div id="encoding-body-${value[0]}" class="flex-element flex-v toggle"></div>
        </div>`).appendTo(`#log-body-encode`);
        encodingsOdd = (encodingsOdd + 1) % 2;
      }
    });
  };

  var cancel = function(message) {
    $(`#time-${message.label}`).text('Canceled');
    $(`#encode-complete-${message.label}`).val('true');
  }

  $('[id^=log-toggle-]').click(function(e) {
    $('[id^=log-tab-]').each((i, ele) => {
      var id = $(e.currentTarget).attr('id').split('-')[2];

      if($(ele).attr('id').includes(id)) {
        $(ele).addClass("show");
      } else {
        $(ele).removeClass("show");
      }
    });
  });

  client.socket.setEvent(client.keys.SERVERLOG, logging);
  client.socket.setEvent(client.keys.NOTIFICATION, notification);
  client.socket.setEvent(client.keys.ENCODELOG, progress);
  client.socket.setEvent(client.keys.ENCODINGS, loadEncodings);
  client.socket.setEvent(client.keys.ENCODECANCELED, cancel);

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
    var value = $(e.currentTarget.children[0]).val();
    var value = Math.trunc(value / 10);
    $(e.currentTarget.children[0]).val(value * 10);
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
      toggleOverlays();
    }
  });

  var addBaseDirInfo = function(elementId) {

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
      toggleOverlays('path-dropdown');
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
    $(document).trigger('textarea-grow');
  };

  var changeDropDown = function() {
    var width = $(`#path-input`).width();
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

  $(document).on('togglePanel', function(e, force) {
    $('.panel').removeAttr("style");
    $('.media').removeAttr("style");
    $('.side').removeAttr("style");

    if(force) {
      $('.panel').removeClass('show');
      $('.media').addClass('show');

      $('.side .flex-icon').each((index, element) => {
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
    initEncode();
  } else {
    $('.is-admin').each((index, ele) => {
      $(ele).removeClass('show');
    });
  }
}
