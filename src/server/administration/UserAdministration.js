const Promise     = require('bluebird');
const Smtp        = require('./Smtp');
const Session     = require('./Session');
const LogManager  = require('../log/LogManager');
const Publisher   = require('../process/redis/RedisPublisher');
const Config     	= require('../utils/Config');

var log         = LogManager.getLog(LogManager.LogEnum.ADMINISTRATION);
var config, publisher, smtp, session;

function lazyInit() {
  config      = new Config();
  publisher   = new Publisher();
  smtp        = new Smtp();
  session     = new Session();
}

class UserAdministration {
  constructor() {
    if(typeof UserAdministration.prototype.lazyInit === 'undefined') {
      lazyInit();
      UserAdministration.prototype.lazyInit = true;
    }
  }
}

UserAdministration.prototype.downgradeUser = function(user) {
  log.debug("UserAdministration.downgradeUser");
  publisher.publish(Publisher.Enum.PLAYER, ['setAuth', [user, Player.Auth.RESTRICTED]]);
};

UserAdministration.prototype.upgradeUser = function(user) {
  log.debug("UserAdministration.upgradeUser");
  publisher.publish(Publisher.Enum.PLAYER, ['setAuth', [user, Player.Auth.DEFAULT]]);
};

UserAdministration.prototype.kickUser = Promise.coroutine(function* (user, callback) {
  log.debug("UserAdministration.kickUser");
  yield session.removeInvitee(user);

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

UserAdministration.prototype.disconnectSocket = Promise.coroutine(function* (socket) {
  log.info("Disconnecting socket ", socket.id);
  yield session.removeInvitee(socket.id, disconnect);
  socket.disconnect('unauthorized');
};

UserAdministration.prototype.inviteUser = Promise.coroutine(function* (emailAddress) {
  log.debug("UserAdministration.inviteUser");
  var activeSession = yield session.getSession();

  if(session) {
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
};

UserAdministration.prototype.inviteUsers = Promise.coroutine(function* () {
  log.debug("UserAdministration.inviteUsers");
  var activeSession = yield session.getSession();

  if(activeSession) {
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
};

module.exports = UserAdministration;

function addP2PLink(mailOptions, callback) {
  log.silly("adding Link");
  mailOptions.text = `${mailOptions.text} \n\n Link: https://${config.getConfig().host}:${config.getConfig().port}/html/client.html`;
  callback(mailOptions);
}
