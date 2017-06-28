const Promise   = require('bluebird');

var userAdmin, chatEngine, publisher, log;

function CommandEngine() { }

CommandEngine.prototype.initialize = function()
  if(typeof CommandEngine.prototype.lazyInit === 'undefined') {
    userAdmin       = this.factory.createUserAdministration();
    chatEngine      = this.factory.createChatEngine();
    publisher       = this.factory.createRedisPublisher();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.CHAT);

    CommandEngine.prototype.lazyInit = true;
  }
};

CommandEngine.prototype.processAdminCommand = Promise.coroutine(function* (admin, command) {
  log.debug("CommandEngine.prototype.processAdminCommand");
  var action;

  switch(command.command) {
    case CommandEngine.AdminEnum.INVITE:
      userAdmin.inviteUser(command.param[0]);
      action = [CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.PING, "admin invite response"]];
      break;
    case CommandEngine.AdminEnum.KICK:
      userAdmin.kickUser(command.param[0]);
      action = [CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.PING, "admin kick response"]];
      break;
    case CommandEngine.AdminEnum.DOWNGRADE:
      userAdmin.downgradeUser(command.param[0]);
      action = [CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.PING, "admin downgrade response"]];
      break;
    case CommandEngine.AdminEnum.UPGRADE:
      userAdmin.upgradeUser(command.param[0]);
      action = [CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.PING, "admin upgrade response"]];
      break;
    case CommandEngine.ClientEnum.HELP:
      action = [CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.PING, "admin help response"]];
      break;
    default:
      action = yield this.processCommand(admin, command);
      break;
  }

  return action;
};

CommandEngine.prototype.processCommand = Promise.coroutine(function* (issuer, command) {
  log.debug("CommandEngine.prototype.processCommand", command);
  var action;

  switch(command.command) {
    case CommandEngine.ClientEnum.PLAY:
      var engineCommand = [publisher.Enum.STATE, ['play', [issuer.id]]];
      var chat = [ChatEngine.Enum.EVENT, "issued play"];
      action = [CommandEngine.RespEnum.COMMAND, [engineCommand, chat]];
      break;
    case CommandEngine.ClientEnum.PAUSE:
      var engineCommand = [publisher.Enum.STATE, ['pause', [issuer.id]]];
      var chat = [ChatEngine.Enum.EVENT, "issued pause"];
      action = [CommandEngine.RespEnum.COMMAND, [engineCommand, chat]];
      break;
    case CommandEngine.ClientEnum.SEEK:
      var engineCommand = [publisher.Enum.STATE, ['seek', [issuer.id, { seekTime: timestampToSeconds(command.param[0])}]]];
      var chat = [ChatEngine.Enum.EVENT, `issued seek to ${timestampToSeconds(command.param[0])}`];
      action = [CommandEngine.RespEnum.COMMAND, [engineCommand, chat]];
      break;
    case CommandEngine.ClientEnum.HANDLE:
      yield publisher.publishAsync(publisher.Enum.PLAYER, ['setPlayerHandle', [issuer.socket.id, command.param[0]]]);
      action = [CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.EVENT, `ID: ${issuer.id} changed their handle to ${command.param[0]}`]];
      break;
    case CommandEngine.ClientEnum.HELP:
      action = [CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.PING, "help response"]];
      break;
    default:
      action = [CommandEngine.RespEnum.CHAT, [ChatEngine.Enum.PING, `${command.command} is not a recognized command, type /help for a list of commands.`]];
      break;
  }

  return action;
};

CommandEngine.AdminEnum = { INVITE : "/invite", KICK : "/kick", DOWNGRADE : "/downgrade", UPGRADE : "/upgrade"};
CommandEngine.ClientEnum = { PLAY : "/play", PAUSE : "/pause", SEEK : "/seek", HANDLE : "/handle", HELP : "/help"};
CommandEngine.RespEnum = { COMMAND: "command", CHAT: "chat"};

CommandEngine.prototype.adminEnum = AdminEnum;
CommandEngine.prototype.clientEnum = ClientEnum;
CommandEngine.prototype.respEnum = RespEnum;

module.exports = CommandEngine;

function timestampToSeconds(timestamp) {
  var timeArray = timestamp.split(':').reverse();
  var seconds = 0;

  for(var i in timeArray) {
    seconds += parseInt(timeArray[i], 10) * Math.pow(60, i);
  }

  return seconds;
}
