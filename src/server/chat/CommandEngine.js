var StateEngine   = require('./StateEngine.js');
var PlayerManager = require('../state/player/PlayerManager');

var stateEngine   = new StateEngine();
var playerManager = new PlayerManager();

function CommandEngine() {

}

CommandEngine.prototype.processAdminCommand = function(command, callback) {
  switch(command.command) {
    case CommandEngine.Enum.INVITE:
    break;
    case CommandEngine.Enum.KICK:
    break;
    case CommandEngine.Enum.HELP:
      callback("admin response");
    break;
    default:
      this.processCommand(command, callback);
    break;
  }
};

CommandEngine.prototype.processCommand = function(command, callback) {
  switch(command.command) {
    case CommandEngine.Enum.PLAY:
      callback("response");
      stateEngine.play();
    break;
    case CommandEngine.Enum.PAUSE:
      callback("response");
      stateEngine.pause();
    break;
    case CommandEngine.Enum.SEEK:
      callback("response");
      stateEngine.pause(command.param);
    break;
    case CommandEngine.Enum.USERS:
    break;
    case CommandEngine.Enum.HELP:
      callback("response");
    break;
    default:
      callback(command.command + " is not a recognized command, type /help for a list of commands.");
    break;
  }
};

module.exports = CommandEngine;

CommandEngine.Enum = {"PLAY" : 0, "PAUSE" : 1, "SEEK" : 2, "USERS" : 3, "INVITE" : 4, "KICK" : 5, "HELP" : 6};
