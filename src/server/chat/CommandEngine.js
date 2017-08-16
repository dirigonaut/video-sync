const Promise = require('bluebird');

var userAdmin, eventKeys, publisher, stateEngine, playerManager, schemaFactory, log;

function CommandEngine() { }

CommandEngine.prototype.initialize = function(force) {
  if(typeof CommandEngine.prototype.protoInit === 'undefined') {
    CommandEngine.prototype.protoInit = true;
    CommandEngine.prototype.AdminEnum = CommandEngine.AdminEnum;
    CommandEngine.prototype.ClientEnum = CommandEngine.ClientEnum;
    CommandEngine.prototype.RespEnum = CommandEngine.RespEnum;

    userAdmin       = this.factory.createUserAdministration();
    schemaFactory   = this.factory.createSchemaFactory();
    eventKeys       = this.factory.createKeys();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.CHAT);
  }

  if(force === undefined ? typeof CommandEngine.prototype.stateInit === 'undefined' : force) {
    CommandEngine.prototype.stateInit = true;
    publisher       = this.factory.createRedisPublisher();
    stateEngine     = this.factory.createStateEngine(false);
    playerManager   = this.factory.createPlayerManager(false);
  }
};

CommandEngine.prototype.processAdminCommand = Promise.coroutine(function* (admin, command) {
  log.debug("CommandEngine.processAdminCommand", command);
  var action;

  switch(command.command) {
    case CommandEngine.AdminEnum.INVITE:
      userAdmin.inviteUser(command.param[0]);
      action = [CommandEngine.RespEnum.CHAT, [eventKeys.PINGRESP, `User ${command.param[0]} has been invited.`]];
      break;

    case CommandEngine.AdminEnum.KICK:
      userAdmin.kickUser(command.param[0]).catch(log.error);
      action = [CommandEngine.RespEnum.CHAT, [eventKeys.PINGRESP, `User ${command.param[0]} has been kicked.`]];
      break;

    case CommandEngine.AdminEnum.DOWNGRADE:
      userAdmin.downgradeUser(command.param[0]);
      action = [CommandEngine.RespEnum.CHAT, [eventKeys.PINGRESP, `User ${command.param[0]} has been downgraded.`]];
      break;

    case CommandEngine.AdminEnum.UPGRADE:
      userAdmin.upgradeUser(command.param[0]);
      action = [CommandEngine.RespEnum.CHAT, [eventKeys.PINGRESP, `User ${command.param[0]} has been upgraded.`]];
      break;

    case CommandEngine.ClientEnum.HELP:
      action = [CommandEngine.RespEnum.CHAT, [eventKeys.PINGRESP, "admin help response"]];
      break;

    default:
      action = yield this.processCommand(admin, command);
      break;
  }

  return action;
});

CommandEngine.prototype.processCommand = Promise.coroutine(function* (issuer, command) {
  log.debug("CommandEngine.processCommand", command);
  var action;

  switch(command.command) {
    case CommandEngine.ClientEnum.PLAY:
      var engineCommand = [publisher.Enum.STATE, [stateEngine.functions.PLAY, [issuer.id]]];
      var chat = [eventKeys.EVENTRESP, "issued play"];
      action = [CommandEngine.RespEnum.COMMAND, [engineCommand, chat]];
      break;

    case CommandEngine.ClientEnum.PAUSE:
      var engineCommand = [publisher.Enum.STATE, [stateEngine.functions.PAUSE, [issuer.id]]];
      var chat = [eventKeys.EVENTRESP, "issued pause"];
      action = [CommandEngine.RespEnum.COMMAND, [engineCommand, chat]];
      break;

    case CommandEngine.ClientEnum.SEEK:
      if(typeof command.param !== 'undefined' && command.param.length >= 1) {
        var schema = schemaFactory.createPopulatedSchema(schemaFactory.Enum.STATE, [timestampToSeconds(command.param[0])]);
        var engineCommand = [publisher.Enum.STATE, [stateEngine.functions.SEEK, [issuer.id, schema]]];
        var chat = [eventKeys.EVENTRESP, `issued seek to ${timestampToSeconds(command.param[0])}`];
        action = [CommandEngine.RespEnum.COMMAND, [engineCommand, chat]];
      } else {
        action = [CommandEngine.RespEnum.CHAT, [eventKeys.PINGRESP, 'Missing time attribute formate 00:00:00.']];
      }
      break;

    case CommandEngine.ClientEnum.HANDLE:
      yield publisher.publishAsync(publisher.Enum.PLAYER, [playerManager.functions.SETPLAYERHANDLE, [issuer.id, command.param[0]]]);
      action = [CommandEngine.RespEnum.CHAT, [eventKeys.EVENTRESP, `ID: ${issuer.id} changed their handle to ${command.param[0]}`]];
      break;

    case CommandEngine.ClientEnum.HELP:
      action = [CommandEngine.RespEnum.CHAT, [eventKeys.PINGRESP, "help response"]];
      break;

    default:
      action = [CommandEngine.RespEnum.CHAT, [eventKeys.PINGRESP, `${command.command} is not a recognized command, type /help for a list of commands.`]];
      break;
  }

  return action;
});

CommandEngine.AdminEnum = { INVITE : "/invite", KICK : "/kick", DOWNGRADE : "/downgrade", UPGRADE : "/upgrade"};
CommandEngine.ClientEnum = { PLAY : "/play", PAUSE : "/pause", SEEK : "/seek", HANDLE : "/handle", HELP : "/help"};
CommandEngine.RespEnum = { COMMAND: "command", CHAT: "chat"};

module.exports = CommandEngine;

function timestampToSeconds(timestamp) {
  var timeArray = timestamp.split(':').reverse();
  var seconds = 0;

  for(var i in timeArray) {
    var temp = parseInt(timeArray[i], 10) * Math.pow(60, i);
    if(temp === temp) {
      seconds += temp;
    } else {
      throw new Error(`timestamp value ${timestamp} is not a valid number.`);
    }
  }

  return seconds;
}
