var Smtp  = require('./utils/smtp/Smtp');

var smtp = new Smtp();

function SmtpController(io, socket, val_util) {

  initialize(io, socket);
}

function initialize(io, socket) {
  console.log("Attaching SmtpController");

  //Smtp Events
  socket.on('smtp-init', function (data) {
    if(socket.auth){
      console.log('smtp-init-creds');
      smtp.initialize(val_util.check_smtp(data));
    }
  });

  socket.on('smtp-invite', function (data) {
    if(socket.auth){
      console.log('smtp-invite');
      smtp.build_and_send_invitations(val_util.check_email(data));
    }
  });
}

module.exports = SmtpController;
