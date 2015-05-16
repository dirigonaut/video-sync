var email   		= require("emailjs");
var db_utils 		= require("../nedb/database_utils");

var db 					= new db_utils();
var server 			= null;
var smtp_creds	= null;

function smtp_service(){
};

smtp_service.prototype.initialize = function(request) {
	console.log("Initializing...");
	if(smtp_creds == null || smtp_creds.user.localeCompare(request.data.user)){
		console.log("Get smtp creds");
		db.get_smtp(request, this.set_smtp);
		server = null;
	}
};

smtp_service.prototype.set_smtp = function(request, results){
	smtp = results[0];
	console.log("Set smtp creds");
	this.start_server(request);
};

smtp_service.prototype.start_server = function(request){
	console.log("Initiating email creds.");

	if(server == null){
		if(true){
			server = 		email.server.connect({
				user:			smtp.user,
				password:	smtp.pass,
				host:			smtp.host,
				ssl:			true
			});
		} else {
			server = 		email.server.connect({
				user:			smtp.user,
				password:	smtp.pass,
				host:			smtp.host,
				tls: 			{ciphers: "SSLv3"}
			});
		}
		console.log("Email cred setup complete");
		//TODO emit socket here to tell client smtp setup
	}
};

smtp_service.prototype.build_and_send_invitations = function(request){
	var message = request.data;
	this.send_email(message);
	db.add_entry({"invitees" : message.recipients});
};

smtp_service.prototype.build_and_send_auth_message = function(auth_token, recipient){
	var auth_message = {"subject" : "authentication token", "message" : "Here is your token: " + auth_token, "recipients" : recipient}
	this.send_email(auth_message);
};

smtp_service.prototype.send_email = function(data){
	console.log("Building messages to send.");
	if(server != null && data != null){
		for (var i in data.recipients) {
			this.create_email(data.recipients[i], data.subject, data.message);
		}
	}
};

smtp_service.prototype.create_email = function(to, subject, body){
	var email = {
		from: 		smtp.from,
		to:				to,
		subject: 	subject,
		text: 		body
	};

	console.log("Sending message");

	server.send(email, function(err, response) { console.log(err, response); });
};

module.exports = smtp_service;
