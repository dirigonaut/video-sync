var PlayerManager = require('../player/PlayerManager');
var Player        = require('../player/Player');
var NeDatabase    = require('../database/NeDatabase');
var Smtp          = require('./Smtp');
var Session       = require('./Session');
var Log           = require('../utils/Logger');

var playerManager = new PlayerManager();
var database      = new NeDatabase();
var smtp          = new Smtp();
var session       = new Session();

function UserAdministration() { }

UserAdministration.prototype.downgradeUser = function(user) {
  if(!session.isAdmin(user)) {
    var player = playerManager.getPlayer(user);
    player.setAuth(Player.Auth.RESTRICTED);
  }
};

UserAdministration.prototype.upgradeUser = function(user) {
  if(!session.isAdmin(user)) {
    var player = playerManager.getPlayer(user);
    player.setAuth(Player.Auth.DEFAULT);
  }
};

UserAdministration.prototype.kickUser = function(user, callback) {
  console.log("UserAdministration.kickUser");
  session.removeInvitee(user, session.getActiveSession());
  var socket = playerManager.getPlayer(user).socket;
  this.disconnectSocket(socket);
};

UserAdministration.prototype.disconnectSocket = function(socket) {
  console.log("Disconnecting socket ", socket.id);
  database.deleteTokens(socket.id);
  socket.disconnect('unauthorized');
};

UserAdministration.prototype.inviteUser = function(emailAddress) {
  console.log("UserAdministration.inviteUser");
  var currentSession = session.getActiveSession();
  session.addInvitee(emailAddress, currentSession);

  var sendInvitation = function(address) {
    var mailOptions = currentSession.mailOptions;
    mailOptions.invitees = [emailAddress];

    smtp.sendMail(addP2PLink(mailOptions));
  };

  smtp.initializeTransport(currentSession.smtp, sendInvitation);
};

UserAdministration.prototype.inviteUsers = function() {
  var sendInvitations = function(address) {
    smtp.sendMail(addP2PLink(session.getActiveSession().mailOptions));
  };

  smtp.initializeTransport(session.getActiveSession().smtp, sendInvitations);
};

module.exports = UserAdministration;

function addP2PLink(mailOptions) {
  console.log("adding Link");
  var message = mailOptions.text;
  mailOptions.text = message + " \n\n Link: https://" + session.getLocalIp() + "/html/client.html";
  return mailOptions;
}
