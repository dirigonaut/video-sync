var PlayerManager = require('../player/PlayerManager');
var Player        = require('../player/Player');
var NeDatabase    = require('../database/NeDatabase');
var Smtp          = require('./Smtp');
var Session       = require('./Session');
var LogManager    = require('../log/LogManager');

var log           = LogManager.getLog(LogManager.LogEnum.ADMINISTRATION);

var playerManager = new PlayerManager();
var database      = new NeDatabase();
var smtp          = new Smtp();
var session       = new Session();

function UserAdministration() { }

UserAdministration.prototype.downgradeUser = function(user) {
  log.debug("UserAdministration.downgradeUser");
  var player = playerManager.getPlayer(user);

  if(player !== undefined && player !== null) {
    player.setAuth(Player.Auth.RESTRICTED);
  } else {
    log.error("There is no player with the id: ", user);
  }
};

UserAdministration.prototype.upgradeUser = function(user) {
  log.debug("UserAdministration.upgradeUser");
  var player = playerManager.getPlayer(user);

  if(player !== undefined && player !== null) {
    player.setAuth(Player.Auth.DEFAULT);
  } else {
    log.error("There is no player with the id: ", user);
  }
};

UserAdministration.prototype.kickUser = function(user, callback) {
  log.debug("UserAdministration.kickUser");
  session.removeInvitee(user, session.getActiveSession());
  var player = playerManager.getPlayer(user);

  if(player !== null && player !== undefined) {
    var socket = player.socket;

    if(socket !== undefined && socket !== null) {
      this.disconnectSocket(socket);
    }
  } else {
    log.error("There is no player with the id: ", user);
  }
};

UserAdministration.prototype.disconnectSocket = function(socket) {
  log.info("Disconnecting socket ", socket.id);
  database.deleteTokens(socket.id);
  socket.disconnect('unauthorized');
};

UserAdministration.prototype.inviteUser = function(emailAddress) {
  log.debug("UserAdministration.inviteUser");
  var currentSession = session.getActiveSession();
  session.addInvitee(emailAddress, currentSession);

  var sendInvitation = function(address) {
    var mailOptions = currentSession.mailOptions;
    mailOptions.invitees = [emailAddress];

    smtp.sendMail(addP2PLink(mailOptions));
  };

  if(currentSession !== null && currentSession !== undefined) {
    smtp.initializeTransport(currentSession.smtp, sendInvitation);
  } else {
    log.error("There is no active session to load smtp info from.");
  }
};

UserAdministration.prototype.inviteUsers = function() {
  log.debug("UserAdministration.inviteUsers");
  var sendInvitations = function(address) {
    smtp.sendMail(addP2PLink(session.getActiveSession().mailOptions));
  };

  smtp.initializeTransport(session.getActiveSession().smtp, sendInvitations);
};

module.exports = UserAdministration;

function addP2PLink(mailOptions) {
  log.silly("adding Link");
  var message = mailOptions.text;
  mailOptions.text = message + " \n\n Link: https://" + session.getLocalIp() + "/html/client.html";
  return mailOptions;
}
