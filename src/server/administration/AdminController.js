var UserAdmin       = require("./UserAdministration");
var Session         = require('./Session');
var Validator       = require('../authentication/Validator');
var CommandEngine   = require('../chat/CommandEngine');
var ChatEngine      = require('../chat/ChatEngine');
var FileSystemUtils = require('../utils/FileSystemUtils');
var FileIO          = require('../utils/FileIO');
var LogManager      = require('../log/LogManager');
var RedisSocket     = require('../process/redis/RedisSocket');
var Publisher       = require('../process/redis/RedisPublisher');

var log           = LogManager.getLog(LogManager.LogEnum.ADMINISTRATION);

var userAdmin     = new UserAdmin();
var session       = new Session();
var validator     = new Validator();
var commandEngine = new CommandEngine();
var chatEngine    = new ChatEngine();
var redisSocket   = new RedisSocket();
var publisher     = new Publisher();

function AdminController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  log.info("Attaching AdminController");

  socket.on('admin-smtp-invite', function() {
    var ifAdmin = function(isAdmin) {
      log.debug("admin-smtp-invite");

      if(isAdmin) {
        userAdmin.inviteUsers();
      }
    }

    session.isAdmin(socket.id, ifAdmin);
  });

  socket.on('admin-set-media', function(data) {
    var ifAdmin = function(isAdmin) {
      if(isAdmin) {
        log.debug('admin-set-media');
        var fileIO = new FileIO();

        var setMedia = function() {
          var fileUtils = new FileSystemUtils();
          data = fileUtils.ensureEOL(data);

          session.setMediaPath(data);

          var emitMediaReady = function(playerIds) {
            log.debug('media-ready');
            var message = chatEngine.buildMessage(socket.id, "Video has been initialized.");
            chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
            redisSocket.broadcast('media-ready');
          };

          publisher.publish(Publisher.Enum.PLAYER, ['getPlayerIds', []], emitMediaReady);
        }

        fileIO.dirExists(data, setMedia);
      }
    };

    session.isAdmin(socket.id, ifAdmin);
  });

  socket.on('admin-load-session', function(data) {
    var ifAdmin = function(isAdmin) {
      if(isAdmin){
        log.debug('admin-load-session');
        session.setSession(data);
      }
    }

    session.isAdmin(socket.id, ifAdmin);
  });

  socket.on('chat-command', function(data) {
    var ifAdmin = function(isAdmin) {
      if(isAdmin){
        log.debug('admin-chat-command');

        var chatResponse = function(event, text) {
          var message = chatEngine.buildMessage(socket.id, text);

          if(event === ChatEngine.Enum.PING) {
            log.silly('chat-command-response', data);
            chatEngine.ping(event, message);
          } else {
            log.silly('chat-command-response', data);
            chatEngine.broadcast(event, message);
          }
        };

        var stateResponse = function(command, chat) {
          log.debug(`admin-chat-command emitting event`);
          var onState = function(commands) {
            for(var i in commands) {
              redisSocket.ping.apply(null, commands[i]);
            }

            chatResponse.apply(null, chat);
          };

          command.push(onState);
          publisher.publish.apply(null, command);
        };

        var handleResponse = function(key, param) {
          if(key === CommandEngine.RespEnum.COMMAND) {
            stateResponse.apply(null, param);
          } else if(key === CommandEngine.RespEnum.CHAT){
            chatResponse.apply(null, param);
          }
        };

        var processCommand = function(admin) {
          commandEngine.processAdminCommand(admin, data, handleResponse);
        };

        publisher.publish(Publisher.Enum.PLAYER, ['getPlayer', [socket.id]], processCommand);
      }
    };

    session.isAdmin(socket.id, ifAdmin);
  });
}

module.exports = AdminController;
