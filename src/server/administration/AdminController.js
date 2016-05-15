var Session   = require('../utils/Session');
var Validator = require('../utils/Validator');

var validator = new Validator();
var session   = new Session();

function AdminController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  console.log("Attaching AdminController");

  socket.on('admin-set-media', function(data) {
    if(session.isAdmin(socket.id) && session.getActiveSession() != null){
      console.log('admin-set-media');

      session.setMediaPath = data;
      io.emit("media-ready");
    }
  });
}

module.exports = AdminController;
