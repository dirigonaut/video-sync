var UserAdmin       = require("./UserAdministration");
var Session         = require('./Session');
var Validator       = require('../authentication/Validator');
var CommandEngine   = require('../chat/CommandEngine');
var ChatEngine      = require('../chat/ChatEngine');
var FileSystemUtils = require('../utils/FileSystemUtils');
var FileIO          = require('../utils/FileIO');
var LogManager      = require('../log/LogManager');
var Publisher       = require('../process/redis/RedisPublisher');

var log           = LogManager.getLog(LogManager.LogEnum.ADMINISTRATION);

var userAdmin     = new UserAdmin();
var session       = new Session();
var validator     = new Validator();
var commandEngine = new CommandEngine();
var chatEngine    = new ChatEngine();
var publisher     = new Publisher();

function AdminController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  log.info("Attaching AdminController");

  socket.on('admin-smtp-invite', function() {
    if(session.isAdmin(socket.id) && session.getActiveSession() != null){
      log.debug("admin-smtp-invite");
      userAdmin.inviteUsers();
    }
  });

  socket.on('admin-set-media', function(data) {
    if(session.isAdmin(socket.id)){
      log.debug('admin-set-media');
      var fileIO = new FileIO();

      var setMedia = function() {
        var fileUtils = new FileSystemUtils();
        data = fileUtils.ensureEOL(data);

        session.setMediaPath(data);

        var emitMediaReady = function(players) {
          var message = chatEngine.buildMessage(socket.id, "video Has been initialized.");
          chatEngine.broadcast(ChatEngine.Enum.EVENT, message);

          for(var player of players) {
            player[1].socket.emit('media-ready');
          }
        };

        publisher.publish(Publisher.Enum.PLAYER, ['getPlayers', []], emitMediaReady);
      }

      fileIO.dirExists(data, setMedia);
    }
  });

  socket.on('admin-load-session', function(data) {
    if(session.isAdmin(socket.id)){
      log.debug('admin-load-session');
      session.loadSession(data);
    }
  });

  socket.on('chat-command', function(data) {
    if(session.isAdmin(socket.id)){
      log.debug('admin-chat-command');

      var response = function(event, text) {
        var message = chatEngine.buildMessage(socket.id, text);

        if(event === ChatEngine.Enum.PING) {
          chatEngine.ping(event, message);
        } else {
          chatEngine.broadcast(event, message);
        }
      }

      var processCommand = function(admin) {
        commandEngine.processAdminCommand(admin, data, response);
      }

      publisher.publish(Publisher.Enum.PLAYER, ['getPlayer', [socket.id]], processCommand);
    }
  });

  socket.on('admin-change-log', function(data) {
    if(session.isAdmin(socket.id)){
      log.debug('admin-change-log');
      var logManager = new LogManager();
      logManager.changeLog(data);
    }
  });
}

module.exports = AdminController;
