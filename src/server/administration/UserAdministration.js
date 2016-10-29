var PlayerManager = require('../state/player/PlayerManager');
var NeDatabase    = require('../database/NeDatabase');
var Smtp          = require('./Smtp');
var Session       = require('./Session');
var Log           = require('../utils/Logger');

var playerManager = new PlayerManager();
var database      = new NeDatabase();
var smtp          = new Smtp();
var session       = new Session();

function UserAdministration() { }

UserAdministration.prototype.kickUser = function(user) {
  session.getActiveSession().removeInvitee(user, session);
  database.deleteTokens(user, null);
  playerManager.removePlayer(user);

  this.disconnectSocket();
};

UserAdministration.prototype.disconnectSocket = function(socket) {
  Log.trace("Disconnecting socket ", socket.id);
  database.deleteTokens(socket.id);
  socket.disconnect('unauthorized');
};

UserAdministration.prototype.purgeUserInfo = function(user) {
  database.deleteTokens(user, null);
  playerManager.removePlayer(user);
};

UserAdministration.prototype.inviteUser = function(user) {
  session.getActiveSession().addInvitee(user, session);

  var sendInvitations = function(address) {
    var mailOptions = session.getActiveSession().mailOptions;
    mailOptions.invitees = [user];

    smtp.sendMail(addP2PLink(session.getActiveSession().mailOptions));
  };

  smtp.initializeTransport(session.getActiveSession().smtp, sendInvitations);
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
