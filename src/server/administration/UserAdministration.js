const Promise = require('bluebird');

var publisher, smtp, session, config, log;

function UserAdministration() { }

UserAdministration.prototype.initialize = function () {
  if(typeof UserAdministration.prototype.protoInit === 'undefined') {
    UserAdministration.prototype.protoInit = true;

    config          = this.factory.createConfig();
    publisher       = this.factory.createRedisPublisher();
    smtp            = this.factory.createSmtp();
    session         = this.factory.createSession();

    var logManager  = this.factory.createLogManager();
    log             = logManager.getLog(logManager.LogEnum.ADMINISTRATION);
  }
};

UserAdministration.prototype.downgradeUser = Promise.coroutine(function* (user) {
  log.debug("UserAdministration.downgradeUser");
  yield publisher.publishAsync(publisher.Enum.PLAYER, ['setAuth', [user, Player.Auth.RESTRICTED]]);
});

UserAdministration.prototype.upgradeUser = Promise.coroutine(function*(user) {
  log.debug("UserAdministration.upgradeUser");
  yield publisher.publishAsync(publisher.Enum.PLAYER, ['setAuth', [user, Player.Auth.DEFAULT]]);
});

UserAdministration.prototype.kickUser = Promise.coroutine(function* (user, callback) {
  log.debug("UserAdministration.kickUser");
  var isAdmin = yield session.isAdmin(user);
  if(!isAdmin) {
    yield session.removeInvitee(user);
    var player = yield publisher.publishAsync(publisher.Enum.PLAYER, ['getPlayer', [user]]);

    if(player !== null && player !== undefined) {
      var socket = player.socket;

      if(socket !== undefined && socket !== null) {
        this.disconnectSocket(socket);
      }
    } else {
      log.warn("There is no player with the id: ", user);
    }
  }

  return new Promise.reject(new Error(`Cannot kick admin.`));
});

UserAdministration.prototype.disconnectSocket = Promise.coroutine(function* (socket) {
  log.info("Disconnecting socket ", socket.id);
  yield session.removeInvitee(socket.id);
  socket.disconnect('unauthorized');
});

UserAdministration.prototype.inviteUser = Promise.coroutine(function* (emailAddress) {
  log.debug("UserAdministration.inviteUser");
  var activeSession = yield session.getSession();

  if(session) {
    activeSession.addInvitee(emailAddress);

    yield smtp.initializeTransport(activeSession.smtp);
    var mailOptions = activeSession.mailOptions;
    mailOptions.invitees = [emailAddress];

    smtp.sendMail(addP2PLink(mailOptions));

  } else {
    log.warn("There is no active session to load smtp info from.");
  }
});

UserAdministration.prototype.inviteUsers = Promise.coroutine(function* () {
  log.debug("UserAdministration.inviteUsers");
  var activeSession = yield session.getSession();

  if(activeSession) {
    yield smtp.initializeTransport(activeSession.smtp);
    smtp.sendMail(addP2PLink(activeSession.mailOptions));
  } else {
    log.warn("There is no active session to load smtp info from.");
  }
});

module.exports = UserAdministration;

function addP2PLink(mailOptions) {
  mailOptions.text = `${mailOptions.text} \n\n Link: https://${config.getConfig().host}:${config.getConfig().port}/html/client.html`;
  return mailOptions;
}
