const Promise   = require('bluebird');

var userAdmin, chatEngine, publisher;

function CommandEngine() { }

CommandEngine.prototype.initialize = Promise.coroutine(function* ()
  if(typeof CommandEngine.prototype.lazyInit === 'undefined') {
    userAdmin  = yield this.factory.createUserAdministration();
    chatEngine = yield this.factory.createChatEngine();
    publisher  = yield this.factory.createRedisPublisher();
    CommandEngine.prototype.lazyInit = true;
  }
});

CommandEngine.prototype.processAdminCommand = function(admin, command, callback) {
  this.log.debug("CommandEngine.prototype.processAdminCommand");
  switch(command.command) {
    case CommandEngine.AdminEnum.INVITE:
      userAdmin.inviteUser(command.param[0]);
      callback(CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.PING, "admin invite response"]);
      break;
    case CommandEngine.AdminEnum.KICK:
      userAdmin.kickUser(command.param[0]);
      callback(CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.PING, "admin kick response"]);
      break;
    case CommandEngine.AdminEnum.DOWNGRADE:
      userAdmin.downgradeUser(command.param[0]);
      callback(CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.PING, "admin downgrade response"]);
      break;
    case CommandEngine.AdminEnum.UPGRADE:
      userAdmin.upgradeUser(command.param[0]);
      callback(CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.PING, "admin upgrade response"]);
      break;
    case CommandEngine.ClientEnum.HELP:
      callback(CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.PING, "admin help response"]);
      break;
    default:
      this.processCommand(admin, command, callback);
      break;
  }
};

CommandEngine.prototype.processCommand = function(issuer, command, callback) {
  this.log.debug("CommandEngine.prototype.processCommand", command);
  switch(command.command) {
    case CommandEngine.ClientEnum.PLAY:
      var engineCommand = [Publisher.Enum.STATE, ['play', [issuer.id]]];
      var chat = [ChatEngine.Enum.EVENT, "issued play"];
      callback(CommandEngine.RespEnum.COMMAND, [engineCommand, chat]);
      break;
    case CommandEngine.ClientEnum.PAUSE:
      var engineCommand = [Publisher.Enum.STATE, ['pause', [issuer.id]]];
      var chat = [ChatEngine.Enum.EVENT, "issued pause"];
      callback(CommandEngine.RespEnum.COMMAND, [engineCommand, chat]);
      break;
    case CommandEngine.ClientEnum.SEEK:
      var engineCommand = [Publisher.Enum.STATE, ['seek', [issuer.id, { seekTime: timestampToSeconds(command.param[0])}]]];
      var chat = [ChatEngine.Enum.EVENT, `issued seek to ${timestampToSeconds(command.param[0])}`];
      callback(CommandEngine.RespEnum.COMMAND, [engineCommand, chat]);
      break;
    case CommandEngine.ClientEnum.HANDLE:
      callback(CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.EVENT, `ID: ${issuer.id} changed their handle to ${command.param[0]}`]);
      publisher.publish(Publisher.Enum.PLAYER, ['setPlayerHandle', [issuer.socket.id, command.param[0]]]);
      break;
    case CommandEngine.ClientEnum.HELP:
      callback(CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.PING, "help response"]);
      break;
    default:
      callback(CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.PING, `${command.command} is not a recognized command, type /help for a list of commands.`]);
      break;
  }
};

module.exports = CommandEngine;

CommandEngine.AdminEnum = { INVITE : "/invite", KICK : "/kick", DOWNGRADE : "/downgrade", UPGRADE : "/upgrade"};
CommandEngine.ClientEnum = { PLAY : "/play", PAUSE : "/pause", SEEK : "/seek", HANDLE : "/handle", HELP : "/help"};
CommandEngine.RespEnum = { COMMAND: "command", CHAT: "chat"};

function timestampToSeconds(timestamp) {
  var timeArray = timestamp.split(':').reverse();
  var seconds = 0;

  for(var i in timeArray) {
    seconds += parseInt(timeArray[i], 10) * Math.pow(60, i);
  }

  return seconds;
}
