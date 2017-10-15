var client;
var cookie = Object.create(Cookie.prototype);
$(document).ready(setupClient);

function setupClient() {
  window.URL = window.URL || window.webkitURL;
  window.MediaSource = window.MediaSource || window.WebKitMediaSource

  Promise.all([
    loadAsyncFile('#control-container', 'menu/controls.html'),
    loadAsyncFile('#login-overlay', 'menu/overlays/login.html'),
    loadAsyncFile('#help-overlay', 'menu/overlays/help.html'),
    loadAsyncScript('../javascript/log.js'),
    loadAsyncScript('../javascript/login.js')
  ]).then(function() {
    $('#loginModal').modal('show');

    client = Object.create(Client.prototype);
    var factory = client.getFactory();
    var socket = factory.createClientSocket();
    var logManager = factory.createClientLogManager();
    logManager.addUILogging(guiLog());

    initClientLogin(socket, factory.createSchemaFactory(), factory.createKeys());
  });

  $(document).on('initializeConnection', function() {
    client.initialize(window.location.host)
    .then(function(results) {
      loadExtraResources(results.isAdmin)
      .then(function() {
        initializeGui(results.isAdmin, results.acknowledge);
      });
    }).catch(function(error) {
      cookie.deleteCookie('creds');
      log.error(error);
    });
  });

  $(document).on('initializeMedia', function() {
    var domElements = {
      mediaSource: new MediaSource(),
      window: window,
      document: document,
      videoElement: document.getElementById('video')
    };

    client.startMedia(container.media, domElements);
  });

  var initializeGui = function(isAdmin, acknowledge) {
    $('#loginModal').modal('hide');
    $('#btnLogin').parent().remove();

    var factory     = client.getFactory();
    var logManager  = factory.createClientLogManager();

    var container = {
      socket:   factory.createClientSocket(),
      formData: factory.createFormData(),
      media:    factory.createMediaController(),
      encode:   factory.createEncodeFactory(),
      schema:   factory.createSchemaFactory(),
      keys:     factory.createKeys(),
      log:      logManager.getLog(logManager.LogEnum.GENERAL),
    };

    //Reload media
    socket.setEvent(container.keys.MEDIAREADY, function() {
      $(document).trigger('initializeMedia');
    });

    results.acknowledge();
    initGUI(container, isAdmin);
  });

  var loadExtraResources = function(isAdmin) {
    if(isAdmin) {
      return Promise.all([
        loadAsyncFile('#side-container', 'menu/side.html'),
        loadAsyncFile('#encode-overlay', 'menu/overlays/encode.html'),
        loadAsyncFile('#side-location', 'menu/menu/location.html')
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
}
