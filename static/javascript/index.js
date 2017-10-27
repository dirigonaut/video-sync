var cookie = Object.create(Cookie.prototype);
$(document).ready(setupClient);

function setupClient() {
  var factory, clientSocket, log;

  window.URL = window.URL || window.webkitURL;
  window.MediaSource = window.MediaSource || window.WebKitMediaSource

  var initialize = function() {
    Promise.all([
      loadAsyncFile('#control-container', 'menu/controls.html'),
      loadAsyncFile('#login-overlay', 'menu/overlays/login.html'),
      loadAsyncFile('#help-overlay', 'menu/overlays/help.html'),
      loadAsyncScript('../javascript/log.js'),
      loadAsyncScript('../javascript/login.js')
    ]).then(function() {
      $('#loginModal').modal('show');

      var factoryManager  = Object.create(FactoryManager.prototype);
      factory             = factoryManager.getFactory();

      var logManager  = factory.createClientLogManager();
      logManager.addUILogging(guiLog());
      log = logManager.getLog(logManager.Enums.LOGS.GENERAL);

      clientSocket = factory.createClientSocket();

      $(document).trigger('initializeConnection',
        initClientLogin(factory.createSchemaFactory(), factory.createKeys()));
    });
  };

  var resets;
  $(document).on('initializeConnection', function(e, token) {
    clientSocket.connectAsync(window.location.host, token)
    .then(function(response) {
      log.ui('Authenticated with server.');

      var isAdmin = response[1] ? true : false;
      var acknowledged = typeof response[0] === 'function' ? response[0] : undefined;

      return { 'acknowledge': acknowledged, 'isAdmin': isAdmin };
    }).then(function(results) {
      if(typeof results.acknowledge === 'undefined') {
        throw new Error('Missing connection hook from server authentication.');
      }

      loadExtraResources(results.isAdmin)
      .then(function() {
        factory.createFileBuffer(true);

        if(resets) {
          resets();
        }

        resets = initializeGui(results.isAdmin, results.acknowledge);
      });
    }).catch(function(error) {
      cookie.deleteCookie('creds');
      $('#loginToken').val('');
      log.error(error);
    });
  });

  var initializeGui = function(isAdmin, acknowledge) {
    $('#loginModal').modal('hide');
    isAdmin ? $('#btnLogin').parent().remove() : undefined;

    var client   = {
      socket:   clientSocket,
      formData: factory.createFormData(true),
      media:    factory.createMediaController(),
      encode:   factory.createEncodeFactory(),
      schema:   factory.createSchemaFactory(),
      keys:     factory.createKeys(),
      log:      log,
    };

    client.socket.events.on(client.socket.Enums.EVENTS.RECONNECT, function() {
      if(client.media.isMediaInitialized()) {
        $(document).trigger('initializeMedia');
      }
    });

    client.socket.events.on(client.socket.Enums.EVENTS.ERROR, function() {
      if(client.media.isMediaInitialized()) {
        $(document).trigger('initializeMedia', [true]);
      }

      $('#loginModal').modal('show');
    });

    acknowledge();
    return initGUI(container, isAdmin);
  };

  var isExtraResourcesLoaded;
  var loadExtraResources = function(isAdmin) {
    if(!isExtraResourcesLoaded) {
      if(isAdmin) {
        return Promise.all([
          loadAsyncFile('#side-container', 'menu/side.html'),
          loadAsyncFile('#encode-overlay', 'menu/overlays/encode.html'),
          loadAsyncFile('#token-overlay', 'menu/overlays/tokens.html'),
          loadAsyncFile('#location-container', 'menu/location.html')
        ])
        .then(function() {
          return loadAsyncScript('../javascript/gui.js')
                    .then(function() { isExtraResourcesLoaded = true; });
        })
      } else {
        return loadAsyncScript('../javascript/gui.js')
                  .then(function() { isExtraResourcesLoaded = true; });
      }
    } else {
      return new Promise.resolve('Extra resources already loaded.');
    }
  };

  var loadAsyncFile = function(elementId, location) {
    return new Promise((resolve, reject) => {
      $(`${elementId}`).load(location, resolve);
    });
  };

  var loadAsyncScript = function(location) {
    return new Promise((resolve, reject) => {
      $.getScript(location, resolve);
    });
  };

  initialize();
}
