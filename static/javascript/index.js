var cookie = Object.create(Cookie.prototype);
$(document).ready(setupClient);

function setupClient() {
  var factory, clientSocket, log;

  window.URL = window.URL || window.webkitURL;
  window.MediaSource = window.MediaSource || window.WebKitMediaSource

  var initialize = function() {
    Promise.all([
      loadAsyncScript('../javascript/login.js'),
      loadAsyncFile('#panel-log', 'gui/panels/log.html'),
      loadAsyncFile('#documenation-body', 'info/documentation.html')
    ]).then(function() {
      var factoryManager  = Object.create(FactoryManager.prototype);
      factory             = factoryManager.getFactory();

      var logManager  = factory.createClientLogManager();
      logManager.addUILogging(guiLog());
      log = logManager.getLog(logManager.Enums.LOGS.GENERAL);

      clientSocket = factory.createClientSocket();

      initClientLogin(factory.createSchemaFactory(), factory.createKeys());
      $(document).trigger('initializeConnection', getCreds());
    });
  };

  $(document).on('initializeConnection', function(e, token) {
    clientSocket.connectAsync(window.location.host, token)
    .then(function(results) {
      results = parseAuth(results);
      if(typeof results.acknowledge === 'undefined') {
        throw new Error('Missing connection hook from server authentication.');
      }

      loadExtraResources(results.isAdmin)
      .then(function(message) {
        log.ui(message);
        factory.createFileBuffer(true);
        initializeGui(results.isAdmin, results.acknowledge);
      }).catch(log.error);
    }).catch(function(error) {
      log.error(error);
      cookie.deleteCookie('creds');
      $('#login-token').val('');
      $('.login').show();
    });
  });

  var initializeGui = function(isAdmin, acknowledge) {
    $('.login').hide();

    var client   = {
      socket:   clientSocket,
      formData: factory.createFormData(true),
      media:    factory.createMediaController(true),
      encode:   factory.createEncodeFactory(),
      schema:   factory.createSchemaFactory(),
      keys:     factory.createKeys(),
      logMan:   factory.createClientLogManager(),
      log:      log,
    };

    client.socket.events.on(client.socket.Enums.EVENTS.RECONNECT, function(response) {
      if(client.media.isMediaInitialized()) {
        $(document).trigger('initializeMedia');
      }

      log.info('Calling handshake');
      var auth = parseAuth(response);
      auth.acknowledge();
      $('.login').hide();
    });

    client.socket.events.on(client.socket.Enums.EVENTS.ERROR, function() {
      if(client.media.isMediaInitialized()) {
        $(document).trigger('initializeMedia', [true]);
      }
      $('.login').show();
    });

    initGui(client, isAdmin);
    log.info('Calling handshake');
    acknowledge();
  };

  var getCreds = function() {
    var creds = cookie.getCookie('creds');
    if(creds) {
      creds = JSON.parse(creds);
      $('#login-handle').val(creds.handle);
      $('#login-token').val(creds.token);
      return [creds];
    }
  };

  var parseAuth = function(response) {
    log.ui('Authenticated with server.');

    var isAdmin = response[1] ? true : false;
    var acknowledged = typeof response[0] === 'function' ? response[0] : undefined;

    return { 'acknowledge': acknowledged, 'isAdmin': isAdmin };
  };

  var isExtraResourcesLoaded;
  var loadExtraResources = function(isAdmin) {
    if(!isExtraResourcesLoaded) {
      if(isAdmin) {
        return Promise.all([
          loadAsyncFile('#panel-encode', 'gui/panels/encode.html'),
          loadAsyncFile('#panel-tokens',  'gui/panels/tokens.html'),
        ]).then(function() {
          return loadAsyncScript('../javascript/gui.js').then(function() {
            isExtraResourcesLoaded = true;
            return Promise.resolve('Extra resources loaded.')
          });
        });
      } else {
        return loadAsyncScript('../javascript/gui.js').then(function() {
          isExtraResourcesLoaded = true;
          return Promise.resolve('Extra resources loaded.')
        });
      }
    } else {
      return Promise.resolve('Extra resources already loaded.');
    }
  };

  var loadAsyncFile = function(elementId, location) {
    return new Promise((resolve, reject) => {
      $(`${elementId}`).load(location, resolve)
    });
  };

  var loadAsyncScript = function(location) {
    return new Promise(function (resolve, reject) {
      $.getScript(location)
      .done(function(script, textStatus) {
        resolve();
      }).fail(function(jqxhr, settings, exception) {
        reject(exception);
      });
    });
  };

  initialize();
}
