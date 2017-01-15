var UserAdmin     = require("./UserAdministration");
var Session       = require('../administration/Session');
var Validator     = require('../authentication/Validator');
var PlayerManager = require('../player/PlayerManager');
var CommandEngine = require('../chat/CommandEngine');
var ChatEngine    = require('../chat/ChatEngine');
var Logger        = require('../utils/Logger');

var userAdmin     = new UserAdmin();
var session       = new Session();
var validator     = new Validator();
var playerManager = new PlayerManager();
var commandEngine = new CommandEngine();
var chatEngine    = new ChatEngine();
var log           = new Logger();

function AdminController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  console.log("Attaching AdminController");

  socket.on('admin-smtp-invite', function() {
    if(session.isAdmin(socket.id) && session.getActiveSession() != null){
      console.log('admin-smtp-invite');
      userAdmin.inviteUsers();
    }
  });

  socket.on('admin-set-media', function(data) {
    if(session.isAdmin(socket.id)){
      console.log('admin-set-media');

      session.setMediaPath(data);

      var players = playerManager.getPlayers();

      var message = chatEngine.buildMessage(socket.id, "video Has been initialized.");
      chatEngine.broadcast(ChatEngine.Enum.EVENT, message);

      for(var player of players) {
        player[1].socket.emit('media-ready');
      }
    }
  });

  socket.on('admin-load-session', function(data) {
    if(session.isAdmin(socket.id)){
      console.log('admin-load-session');
      session.loadSession(data);
    }
  });

  socket.on('chat-command', function(data) {
    if(session.isAdmin(socket.id)){
      console.log('admin-chat-command');

      var response = function(event, text) {
        var message = chatEngine.buildMessage(socket.id, text);

        if(event === ChatEngine.Enum.PING) {
          chatEngine.ping(event, message);
        } else {
          chatEngine.broadcast(event, message);
        }
      }

      var admin = playerManager.getPlayer(socket.id);
      commandEngine.processAdminCommand(admin, data, response);
    }
  });
}

module.exports = AdminController;
