var UserAdmin     = require('../administration/UserAdministration');
var StateEngine   = require('../state/StateEngine.js');
var PlayerManager = require('../player/PlayerManager');
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
    case CommandEngine.AdminEnum.INVITE:
      var message = chatEngine.buildMessage(ChatEngine.SYSTEM, command.issuer, "admin invite response");
      userAdmin.inviteUser(command.param);
      chatEngine.ping(ChatEngine.PING, message);
      break;
    case CommandEngine.AdminEnum.KICK:
      var message = chatEngine.buildMessage(ChatEngine.SYSTEM, command.issuer, "admin kick response");
      userAdmin.kickUser(command.param);
      chatEngine.ping(ChatEngine.PING, message);
      break;
    case CommandEngine.AdminEnum.DOWNGRADE:
      var message = chatEngine.buildMessage(ChatEngine.SYSTEM, command.issuer, "admin downgrade response");
      userAdmin.downgradeUser(command.param);
      chatEngine.ping(ChatEngine.PING, message);
      break;
    case CommandEngine.AdminEnum.UPGRADE:
      var message = chatEngine.buildMessage(ChatEngine.SYSTEM, command.issuer, "admin upgrade response");
      userAdmin.upgradeUser(command.param);
      chatEngine.ping(ChatEngine.PING, message);
      break;
    case CommandEngine.ClientEnum.HELP:
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
    case CommandEngine.ClientEnum.PLAY:
      callback("play response from " + command.issuer);
      stateEngine.play(command.issuer);
      break;
    case CommandEngine.ClientEnum.PAUSE:
      callback("pause response from " + command.issuer);
      stateEngine.pause();
      break;
    case CommandEngine.ClientEnum.SEEK:
      callback("seek response from " + command.issuer);
      stateEngine.seek(command.param);
      break;
    case CommandEngine.ClientEnum.USERS:
      var message = chatEngine.buildMessage(ChatEngine.SYSTEM, command.issuer, "users response");
      chatEngine.ping(ChatEngine.PING, message);
      break;
    case CommandEngine.ClientEnum.HELP:
      var message = chatEngine.buildMessage(ChatEngine.SYSTEM, command.issuer, "help response");
      chatEngine.ping(ChatEngine.PING, message);
      break;
    default:
      var message = chatEngine.buildMessage(ChatEngine.SYSTEM, command.issuer, `${command.command} is not a recognized command, type /help for a list of commands.`);
      chatEngine.ping(ChatEngine.PING, message);
      break;
  }
};

module.exports = CommandEngine;

CommandEngine.AdminEnum = {"INVITE" : "/invite", "KICK" : "/kick", "DOWNGRADE" : "/downgrade", "UPGRADE" : "/upgrade"};
CommandEngine.ClientEnum = {"PLAY" : "/play", "PAUSE" : "/pause", "SEEK" : "/seek", "USERS" : "/users", "HANDLE" : "/handle", "HELP" : "/help"};
