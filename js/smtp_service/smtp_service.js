var email   = require("emailjs");
var db_utils = require("../nedb/database_utils");

var db 			= new db_utils();
var server 		= null;
var smtp 		= null;
var message 	= null;
var instance 	= null;

function smtp_service(){
	if(instance == null){
		instance = this;
	}
};

smtp_service.prototype.initialize = function() {
	console.log("Initializing...");
	if(smtp == null){
		console.log("Get smtp creds");
		db.get_smtp(instance.set_smtp);
	}
	else{
		instance.start_server();
		instance.send_invitation();
	}
}; 

smtp_service.prototype.start_server = function(){
	console.log("Initiating server start.");
	
	if(server == null){
		if(true){
			server = 	email.server.connect({
				user:		smtp.user,
				password:	smtp.pass,
				host:		smtp.host,
				ssl:		true
			});
		} else {
			server = 	email.server.connect({
				user:		smtp.user,
				password:	smtp.pass,
				host:		smtp.host,
				tls: 		{ciphers: "SSLv3"}
			});
		}
		console.log("Email server started");
	}
};

smtp_service.prototype.stop_server = function(){
	//Stop the email server
};

smtp_service.prototype.set_smtp = function(results){
	smtp = results[0];
	console.log("Set smtp creds");
	instance.initialize();
}
smtp_service.prototype.set_message = function(data){
	message = data;
}
smtp_service.prototype.send_invitation = function(){
	console.log("Building messages to send.");
	if(server != null && message != null){	
		for (var i in message.recipients) {
			var email = {
				from: 		smtp.user,
				to:			message.recipients[i],
				subject: 	message.subject,
				text: 		message.message
			};
		
			console.log("Sending message");
			
			server.send(email, function(err, response) { console.log(err, response); });
		}
	}
};

module.exports = smtp_service;
