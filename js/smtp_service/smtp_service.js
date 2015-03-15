var email   = require("emailjs");

function smtp_service(){ 
	this.server = null;
	
	this.user = null;
	this.pass = null;
	this.smtp = null;
};
	
smtp_service.prototype.add_smtp_service = function(smtp_creds){
	this.user = smtp_creds.smtp_user;
	this.pass = smtp_creds.smtp_pass;
	this.smtp = smtp_creds.smtp_host;
};

smtp_service.prototype.get_smtp_service = function(){
	//Get actual values from db once attached
	return {"smpt_user" : this.user, "smpt_pass" : this.pass, "smpt_host" : this.smtp};
};

smtp_service.prototype.get_all_smtp_services = function(){
};

smtp_service.prototype.change_smtp_service = function(smtp_id){
	//Make database call to switch primarty service
};

smtp_service.prototype.start_server = function(creds){
	if(true){
		this.server = 	email.server.connect({
			user:		creds.smpt_user,
			password:	creds.smpt_pass,
			host:		creds.smpt_host,
			ssl:		true
		});
	} else {
		this.server = 	email.server.connect({
			user:		creds.smpt_user,
			password:	creds.smpt_pass,
			host:		creds.smpt_host,
			tls: 		{ciphers: "SSLv3"}
		});
	}
	console.log("Email server started:" + this.server);
};

smtp_service.prototype.stop_server = function(){
	//Stop the email server
};

smtp_service.prototype.send_invitation = function(message){
	this.start_server(this.get_smtp_service());
	
	for (var i in message.recipients) {
		var email = {
			from: 		this.user,
			to:			message.recipients[i],
			subject: 	message.subject,
			text: 		message.message
		};
		
		console.log("Sending message: " + email + " to " + message.recipients[i]);
		
		this.server.send(email, function(err, response) { console.log(err || message); } );
	}
};

module.exports = smtp_service;
