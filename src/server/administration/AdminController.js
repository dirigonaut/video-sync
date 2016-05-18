var Session     = require('../utils/Session');
var Validator   = require('../utils/Validator');

var validator = new Validator();
var session   = new Session();

function AdminController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  console.log("Attaching AdminController");

  socket.on('admin-set-media', function(data) {
    if(session.isAdmin(socket.id)){
      console.log('admin-set-media');

      session.setMediaPath(data);
      io.emit("media-ready");
    }
  });

  socket.on('admin-load-session', function(data) {
    if(session.isAdmin(socket.id)){
      console.log('admin-load-session');
      session.loadSession(data);
    }
  });
}

module.exports = AdminController;
