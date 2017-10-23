var cookie = Object.create(Cookie.prototype);
$(document).ready(setupClient);

function setupClient() {
  var factory, log;

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

      $(document).trigger('initializeConnection',
        initClientLogin(factory.createSchemaFactory(), factory.createKeys()));
    });
  };

  $(document).on('initializeConnection', function(e, token) {
    var clientSocket = factory.createClientSocket();

    clientSocket.events.once(clientSocket.Enums.EVENTS.DISCONNECT, function() {
      $('#loginModal').modal('show');
      $(document).trigger('initializeMedia', [true]);
    });

    clientSocket.connectAsync(window.location.host, token)
    .then(function(response) {
      log.ui('Authenticated with server.');

      var isAdmin = response[1] ? true : false;
      var acknowledged = response[0] !== 'undefined' ? response[0] : undefined;

      return { 'acknowledge': acknowledged, 'isAdmin': isAdmin };
    }).then(function(results) {
      if(typeof results.acknowledge === 'undefined') {
        throw new Error('Missing connection hook from server authentication.');
      }

      if(results.isAdmin) {
        factory.createFileBuffer(true);
      }

      loadExtraResources(results.isAdmin)
      .then(function() {
        initializeGui(results.isAdmin, results.acknowledge);
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

    var logManager  = factory.createClientLogManager();

    var container   = {
      socket:   factory.createClientSocket(),
      formData: factory.createFormData(),
      media:    factory.createMediaController(),
      encode:   factory.createEncodeFactory(),
      schema:   factory.createSchemaFactory(),
      keys:     factory.createKeys(),
      log:      logManager.getLog(logManager.Enums.LOGS.GENERAL),
    };

    //Reload media
    container.socket.setEvent(container.keys.MEDIAREADY, function() {
      $(document).trigger('initializeMedia');
    });

    acknowledge();
    initGUI(container, isAdmin);
  };

  $(document).on('initializeMedia', function(e, reset) {
    var domElements = {
      mediaSource:  new MediaSource(),
      window:       window,
      document:     document,
      videoElement: document.getElementById('video')
    };

    var mediaController = factory.createMediaController();
    mediaController.initializeMedia(domElements, reset);
  });

  var loadExtraResources = function(isAdmin) {
    if(isAdmin) {
      return Promise.all([
        loadAsyncFile('#side-container', 'menu/side.html'),
        loadAsyncFile('#encode-overlay', 'menu/overlays/encode.html'),
        loadAsyncFile('#token-overlay', 'menu/overlays/tokens.html'),
        loadAsyncFile('#location-container', 'menu/location.html')
      ])
      .then(function() {
        return loadAsyncScript('../javascript/gui.js');
      })
    } else {
      return loadAsyncScript('../javascript/gui.js');
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
