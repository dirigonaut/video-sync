const Promise     = require('bluebird');

var publisher, smtp;

function UserAdministration() { }

UserAdministration.prototype.initialize = Promise.coroutine(function* () {
  if(typeof UserAdministration.prototype.lazyInit === 'undefined') {
    publisher = yield this.factory.createRedisPublisher();
    smtp      = yield this.factory.createSmtp();
    UserAdministration.prototype.lazyInit = true;
  }
});

UserAdministration.prototype.downgradeUser = Promise.coroutine(function* (user) {
  log.debug("UserAdministration.downgradeUser");
  yield publisher.publishAsync(Publisher.Enum.PLAYER, ['setAuth', [user, Player.Auth.RESTRICTED]]);
});

UserAdministration.prototype.upgradeUser = Promise.coroutine(function*(user) {
  log.debug("UserAdministration.upgradeUser");
  yield publisher.publishAsync(Publisher.Enum.PLAYER, ['setAuth', [user, Player.Auth.DEFAULT]]);
});

UserAdministration.prototype.kickUser = Promise.coroutine(function* (user, callback) {
  log.debug("UserAdministration.kickUser");
  var isAdmin = yield session.isAdmin(user);
  if(!isAdmin) {
    yield session.removeInvitee(user);
    var player = yield publisher.publish(Publisher.Enum.PLAYER, ['getPlayer', [user]]);

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
