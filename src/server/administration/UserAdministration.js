var Smtp        = require('./Smtp');
var Session     = require('./Session');
var LogManager  = require('../log/LogManager');
var Publisher   = require('../process/redis/RedisPublisher');

var log         = LogManager.getLog(LogManager.LogEnum.ADMINISTRATION);
var publisher   = new Publisher();
var smtp        = new Smtp();
var session     = new Session();

function UserAdministration() {
}

UserAdministration.prototype.downgradeUser = function(user) {
  log.debug("UserAdministration.downgradeUser");
  publisher.publish(Publisher.Enum.PLAYER, ['setAuth', [user, Player.Auth.RESTRICTED]]);
};

UserAdministration.prototype.upgradeUser = function(user) {
  log.debug("UserAdministration.upgradeUser");
  publisher.publish(Publisher.Enum.PLAYER, ['setAuth', [user, Player.Auth.DEFAULT]]);
};

UserAdministration.prototype.kickUser = function(user, callback) {
  log.debug("UserAdministration.kickUser");
  session.removeInvitee(user);

  var kick = function(player) {
    if(player !== null && player !== undefined) {
      var socket = player.socket;

      if(socket !== undefined && socket !== null) {
        this.disconnectSocket(socket);
      }
    } else {
      log.warn("There is no player with the id: ", user);
    }
  }

  publisher.publish(Publisher.Enum.PLAYER, ['getPlayer', [user]]);
};

UserAdministration.prototype.disconnectSocket = function(socket) {
  log.info("Disconnecting socket ", socket.id);

  var disconnect = function() {
    console.log(socket.id);
    socket.disconnect('unauthorized');
  };

  publisher.publish(Publisher.Enum.DATABASE, ['deleteTokens', [socket.id]], disconnect);
};

UserAdministration.prototype.inviteUser = function(emailAddress) {
  log.debug("UserAdministration.inviteUser");
  var inviteUserIfSession = function(err, activeSession) {
    if(err) {
      log.error(err);
    } else if(session !== null && session !== undefined) {
      activeSession.addInvitee(emailAddress);

      var sendInvitation = function(address) {
        var mailOptions = activeSession.mailOptions;
        mailOptions.invitees = [emailAddress];

        smtp.sendMail(addP2PLink(mailOptions));
      };

      smtp.initializeTransport(activeSession.smtp, sendInvitation);
    } else {
      log.warn("There is no active session to load smtp info from.");
    }
  }

  session.getSession(inviteUserIfSession);
};

UserAdministration.prototype.inviteUsers = function() {
  var inviteUsersIfSession = function(err, activeSession) {
    log.debug("UserAdministration.inviteUsers");
    if(err) {
      log.error(err);
    } else if(activeSession !== null && activeSession !== undefined) {
      var sendInvitations = function(address) {
        var sendEmail = function(mailOptions) {
          smtp.sendMail(mailOptions)
        };
        
        addP2PLink(activeSession.mailOptions, sendEmail);
      };

      smtp.initializeTransport(activeSession.smtp, sendInvitations);
    } else {
      log.warn("There is no active session to load smtp info from.");
    }
  }

  session.getSession(inviteUsersIfSession);
};

module.exports = UserAdministration;

function addP2PLink(mailOptions, callback) {
  var addLink = function(err, baseUrl) {
    if(err) {
      log.error(err);
    } else {
      log.silly("adding Link");
      mailOptions.text = `${mailOptions.text} \n\n Link: https://${baseUrl}/html/client.html`;
      callback(mailOptions);
    }
  }

  session.getIP(addLink);
}
