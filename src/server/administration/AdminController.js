const Promise         = require('bluebird');
const UserAdmin       = require("./UserAdministration");
const Session         = require('./Session');
const Validator       = require('../authentication/Validator');
const CommandEngine   = require('../chat/CommandEngine');
const ChatEngine      = require('../chat/ChatEngine');
const FileSystemUtils = require('../utils/FileSystemUtils');
const FileIO          = require('../utils/FileIO');
const LogManager      = require('../log/LogManager');
const RedisSocket     = require('../process/redis/RedisSocket');
const Publisher       = require('../process/redis/RedisPublisher');

var log           = LogManager.getLog(LogManager.LogEnum.ADMINISTRATION);
var userAdmin, session, validator, commandEngine, chatEngine, redisSocket, publisher;

function lazyInit() {
  userAdmin       = new UserAdmin();
  session         = new Session();
  validator       = new Validator();
  commandEngine   = new CommandEngine();
  chatEngine      = new ChatEngine();
  redisSocket     = new RedisSocket();
  publisher       = new Publisher();
}

class AdminController {
  constructor(io, socket) {
    if(typeof AdminController.prototype.lazyInit === 'undefined') {
      lazyInit();
      AdminController.prototype.lazyInit = true;
    }

    initialize(io, socket);
  }
}

function initialize(io, socket) {
  log.info("Attaching AdminController");

  socket.on('admin-smtp-invite', Promise.coroutine(function* () {
    log.debug("admin-smtp-invite");
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      userAdmin.inviteUsers();
    }
  }));

  socket.on('admin-set-media', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      log.debug('admin-set-media');
      var fileIO = new FileIO();

      var setMedia = Promise.coroutine(function* () {
        var fileUtils = new FileSystemUtils();
        data = fileUtils.ensureEOL(data);

        yield session.setMediaPath(data);

        var emitMediaReady = function(playerIds) {
          log.debug('media-ready');
          var message = chatEngine.buildMessage(socket.id, "Video has been initialized.");
          chatEngine.broadcast(ChatEngine.Enum.EVENT, message);
          redisSocket.broadcast('media-ready');
        };

        publisher.publish(Publisher.Enum.PLAYER, ['getPlayerIds', []], emitMediaReady);
      });

      fileIO.dirExists(data, setMedia);
    }
  }));

  socket.on('admin-load-session', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
      log.debug('admin-load-session');
      session.setSession(data);
    }
  }));

  socket.on('chat-command', Promise.coroutine(function* (data) {
    var isAdmin = yield session.isAdmin(socket.id);
    if(isAdmin) {
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
  }));
}

module.exports = AdminController;
