var UserAdmin     = require('../administration/UserAdministration');
var StateEngine   = require('../state/StateEngine.js');
var PlayerManager = require('../state/player/PlayerManager');
var ChatEngine    = require('./ChatEngine');

var userAdmin     = new UserAdmin();
var stateEngine   = new StateEngine();
var playerManager = new PlayerManager();
var chatEngine    = new ChatEngine();

function CommandEngine() { }

CommandEngine.prototype.processAdminCommand = function(command, callback) {
  console.log("CommandEngine.prototype.processAdminCommand");
  console.log(command);
  switch(command.command) {
    case CommandEngine.Enum.INVITE:
      var message = chatEngine.buildMessage(ChatEngine.SYSTEM, command.issuer, "admin invite response");
      userAdmin.inviteUser(command.param);
      chatEngine.ping(ChatEngine.PING, message);
      break;
    case CommandEngine.Enum.KICK:
      var message = chatEngine.buildMessage(ChatEngine.SYSTEM, command.issuer, "admin kick response");
      userAdmin.kickUser(command.param);
      chatEngine.ping(ChatEngine.PING, message);
      break;
    case CommandEngine.Enum.HELP:
      var message = chatEngine.buildMessage(ChatEngine.SYSTEM, command.issuer, "admin help response");
      chatEngine.ping(ChatEngine.PING, message);
      break;
    default:
      this.processCommand(command, callback);
      break;
  }
};

CommandEngine.prototype.processCommand = function(command, callback) {
  console.log("CommandEngine.prototype.processCommand");
  switch(command.command) {
    case CommandEngine.Enum.PLAY:
      callback("play response from " + command.issuer);
      stateEngine.play(command.issuer);
      break;
    case CommandEngine.Enum.PAUSE:
      callback("pause response from " + command.issuer);
      stateEngine.pause();
      break;
    case CommandEngine.Enum.SEEK:
      callback("seek response from " + command.issuer);
      stateEngine.seek(command.param);
      break;
    case CommandEngine.Enum.USERS:
      var message = chatEngine.buildMessage(ChatEngine.SYSTEM, command.issuer, "users response");
      chatEngine.ping(ChatEngine.PING, message);
      break;
    case CommandEngine.Enum.HELP:
      var message = chatEngine.buildMessage(ChatEngine.SYSTEM, command.issuer, "help response");
      chatEngine.ping(ChatEngine.PING, message);
      break;
    default:
      callback(command.command + " is not a recognized command, type /help for a list of commands.");
      break;
  }
};

module.exports = CommandEngine;

CommandEngine.Enum = {"PLAY" : 0, "PAUSE" : 1, "SEEK" : 2, "USERS" : 3, "INVITE" : 4, "KICK" : 5, "HELP" : 6};
