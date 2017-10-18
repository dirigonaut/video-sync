var client;
var cookie = Object.create(Cookie.prototype);
$(document).ready(setupClient);

function setupClient() {
  console.log("1")
  window.URL = window.URL || window.webkitURL;
  window.MediaSource = window.MediaSource || window.WebKitMediaSource

  var loadAsyncFile = function(elementId, location) {
    return new Promise((resolve, reject) => {
      $(`${elementId}`).load(location, function() { resolve(); console.log(location); });
    });
  };

  var loadAsyncScript = function(location) {
    return new Promise((resolve, reject) => {
      $.getScript(location, function() { resolve(); console.log(location); });
    });
  };

  Promise.all([
    loadAsyncFile('#control-container', 'menu/controls.html'),
    loadAsyncFile('#login-overlay', 'menu/overlays/login.html'),
    loadAsyncFile('#help-overlay', 'menu/overlays/help.html'),
    loadAsyncScript('../javascript/log.js'),
    loadAsyncScript('../javascript/login.js')
  ]).then(function() {
    $('#loginModal').modal('show');

    console.log("2")
    client          = Object.create(Client.prototype);
    var factory     = client.getFactory();
    var socket      = factory.createClientSocket();
    var logManager  = factory.createClientLogManager();
    logManager.addUILogging(guiLog());

    initClientLogin(socket, factory.createSchemaFactory(), factory.createKeys());
  });

  $(document).on('initializeConnection', function() {
    console.log("3")
    client.initialize(window.location.host)
    .then(function(results) {
      if(typeof results.acknowledge === 'undefined') {
        throw new Error('Missing connection hook from server authentication.');
      }

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
    console.log("4")
    var domElements = {
      mediaSource:  new MediaSource(),
      window:       window,
      document:     document,
      videoElement: document.getElementById('video')
    };
  })

  var initializeGui = function(isAdmin, acknowledge) {
    console.log("5")
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
  };

  var loadExtraResources = function(isAdmin) {
    console.log("6")
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
}
