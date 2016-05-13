var email   		= require("emailjs");
var db_utils 		= require("../database/NeDatabase");
var	json_keys		= require('../utils/JsonKeys');

var db 					= new db_utils();

var server 			= null;
var smtp_creds	= null;
var instance 		= null;

function Smtp(){
	if(instance == null){
		instance = this;
	}
};

Smtp.prototype.initialize = function(request) {
	console.log("Initializing...");
	if(instance.smtp_creds == null || !smtp_creds.user.localeCompare(request.data[json_keys.SMTP_USER])){
		console.log("Get smtp creds");
		instance.server = null;
		db.get_smtp(request, instance.set_smtp);
	}
};

Smtp.prototype.set_smtp = function(request, results){
	smtp = results[0];
	console.log("Set smtp creds: ");
	console.log(smtp);
	instance.start_server(request);
};

Smtp.prototype.start_server = function(request){
	console.log("Initiating email creds.");

	if(instance.server == null){
		if(true){
			server = 		email.server.connect({
				user:			smtp[json_keys.SMTP_USER],
				password:	smtp[json_keys.SMTP_PASS],
				host:			smtp[json_keys.SMTP_HOST],
				ssl:			true
			});
		} else {
			server = 		email.server.connect({
				user:			smtp[json_keys.SMTP_USER],
				password:	smtp[json_keys.SMTP_PASS],
				host:			smtp[json_keys.SMTP_HOST],
				tls: 			{ciphers: "SSLv3"}
			});
		}
		console.log("Email cred setup complete");
		request.socket.emit("smtp-initialized", null);
	}
};

Smtp.prototype.build_and_send_invitations = function(request){
	var message = request.data;
	//TODO add server url to message
	this.send_email(message);
	var invitee_list = {"invitees" : request.data[json_keys.RECIPIENTS]};
	request.data = invitee_list;
	db.add_entry(request);
};

//TODO clean up to use request wrapper
Smtp.prototype.build_and_send_auth_message = function(auth_token, recipient){
	var auth_message = {"subject" : "authentication token", "message" : "Here is your token: " + auth_token, "recipients" : recipient }
	this.send_email(auth_message);
};

Smtp.prototype.send_email = function(data){
	console.log("Building messages to send.");
	if(server != null && data != null){
		for (var key in data[json_keys.RECIPIENTS]) {
			var email = {
				from: 		smtp[json_keys.SMTP_USER],
				to:				data[json_keys.RECIPIENTS][key][json_keys.EMAIL],
				subject: 	data[json_keys.SUBJECT],
				text: 		data[json_keys.MESSAGE]
			};

			console.log("Sending message");

			server.send(email, function(err, response) { console.log(err, response); });
		}
	}
};

module.exports = Smtp;
