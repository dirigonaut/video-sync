var UserAdmin     = require('../administration/UserAdministration');
var StateEngine   = require('../state/StateEngine.js');
var PlayerManager = require('../player/PlayerManager');
var ChatEngine    = require('./ChatEngine');

var userAdmin     = new UserAdmin();
var stateEngine   = new StateEngine();
var playerManager = new PlayerManager();
var chatEngine    = new ChatEngine();

function CommandEngine() { }

CommandEngine.prototype.processAdminCommand = function(admin, command, callback) {
  console.log("CommandEngine.prototype.processAdminCommand");
  switch(command.command) {
    case CommandEngine.AdminEnum.INVITE:
      userAdmin.inviteUser(command.param[0]);
      callback(ChatEngine.Enum.PING, "admin invite response");
      break;
    case CommandEngine.AdminEnum.KICK:
      userAdmin.kickUser(command.param[0]);
      callback(ChatEngine.Enum.PING, "admin kick response");
      break;
    case CommandEngine.AdminEnum.DOWNGRADE:
      userAdmin.downgradeUser(command.param[0]);
      callback(ChatEngine.Enum.PING, "admin downgrade response");
      break;
    case CommandEngine.AdminEnum.UPGRADE:
      userAdmin.upgradeUser(command.param[0]);
      callback(ChatEngine.Enum.PING, "admin upgrade response");
      break;
    case CommandEngine.ClientEnum.HELP:
      callback(ChatEngine.Enum.PING, "admin help response");
      break;
    default:
      this.processCommand(admin, command, callback);
      break;
  }
};

CommandEngine.prototype.processCommand = function(issuer, command, callback) {
  console.log("CommandEngine.prototype.processCommand");
  switch(command.command) {
    case CommandEngine.ClientEnum.PLAY:
      stateEngine.play(issuer.socket.id);
      callback(ChatEngine.Enum.EVENT, "issued play");
      break;
    case CommandEngine.ClientEnum.PAUSE:
      stateEngine.pause(issuer.socket.id);
      callback(ChatEngine.Enum.EVENT, "issued pause");
      break;
    case CommandEngine.ClientEnum.SEEK:
      stateEngine.seek({'seektime': timestampToSeconds(command.param[0])});
      callback(ChatEngine.Enum.EVENT, `issued seek to ${timestampToSeconds(command.param[0])}`);
      break;
    case CommandEngine.ClientEnum.HANDLE:
      callback(ChatEngine.Enum.EVENT, `ID: ${issuer.socket.id} changed their handle to ${command.param[0]}`);
      playerManager.setPlayerHandle(issuer.socket.id, command.param[0]);
      break;
    case CommandEngine.ClientEnum.HELP:
      callback(ChatEngine.Enum.PING, "help response");
      break;
    default:
      callback(ChatEngine.Enum.PING, `${command.command} is not a recognized command, type /help for a list of commands.`);
      break;
  }
};

module.exports = CommandEngine;

CommandEngine.AdminEnum = {"INVITE" : "/invite", "KICK" : "/kick", "DOWNGRADE" : "/downgrade", "UPGRADE" : "/upgrade"};
CommandEngine.ClientEnum = {"PLAY" : "/play", "PAUSE" : "/pause", "SEEK" : "/seek", "HANDLE" : "/handle", "HELP" : "/help"};

function timestampToSeconds(timestamp) {
  var timeArray = timestamp.split(':').reverse();
  var seconds = 0;

  for(var i in timeArray) {
    seconds += parseInt(timeArray[i], 10) * Math.pow(60, i);
  }

  return seconds;
}
