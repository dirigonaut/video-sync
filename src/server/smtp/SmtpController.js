var Smtp      = require('./Smtp');
var Session   = require('../utils/Session');
var Validator = require('../utils/Validator');

var smtp      = new Smtp();
var validator = new Validator();
var session   = new Session();

function SmtpController(io, socket) {
  initialize(io, socket);
}

function initialize(io, socket) {
  console.log("Attaching SmtpController");

  socket.on('smtp-invite', function() {
    if(session.isAdmin(socket.id) && session.getActiveSession() != null){
      console.log('smtp-invite');

      var sendInvitations = function(address) {
        smtp.sendMail(session.getActiveSession().mailOptions);
      };

      smtp.initializeTransport(session.getActiveSession().smtp, sendInvitations);
    }
  });
}

module.exports = SmtpController;
