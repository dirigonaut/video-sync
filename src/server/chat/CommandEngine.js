var UserAdmin     = require('../administration/UserAdministration');
var ChatEngine    = require('./ChatEngine');
var LogManager    = require('../log/LogManager');
var Publisher     = require('../process/redis/RedisPublisher');

var log           = LogManager.getLog(LogManager.LogEnum.CHAT);
var userAdmin     = new UserAdmin();
var chatEngine    = new ChatEngine();
var publisher     = new Publisher();

function CommandEngine() {
}

CommandEngine.prototype.processAdminCommand = function(admin, command, callback) {
  log.debug("CommandEngine.prototype.processAdminCommand");
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
  log.debug("CommandEngine.prototype.processCommand");
  switch(command.command) {
    case CommandEngine.ClientEnum.PLAY:
      publisher.publish(Publisher.Enum.STATE, ['play', [issuer.socket.id]]);
      callback(ChatEngine.Enum.EVENT, "issued play");
      break;
    case CommandEngine.ClientEnum.PAUSE:
      publisher.publish(Publisher.Enum.STATE, ['pause', [issuer.socket.id]]);
      callback(ChatEngine.Enum.EVENT, "issued pause");
      break;
    case CommandEngine.ClientEnum.SEEK:
      publisher.publish(Publisher.Enum.STATE, ['seek', [issuer.socket.id, {'seekTime': timestampToSeconds(command.param[0])}]]);
      callback(ChatEngine.Enum.EVENT, `issued seek to ${timestampToSeconds(command.param[0])}`);
      break;
    case CommandEngine.ClientEnum.HANDLE:
      callback(ChatEngine.Enum.EVENT, `ID: ${issuer.socket.id} changed their handle to ${command.param[0]}`);
      publisher.publish(Publisher.Enum.PLAYER, ['setPlayerHandle', [issuer.socket.id, command.param[0]]]);
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
