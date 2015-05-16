var validator 	= require('validator');

// state messages const
var COMMAND 		= "command";
var TIMESTAMP 	= "timestamp";

// callback messages const
var ID 					= "id";

// smtp setup messages const
var USER				= "user";
var PASS				= "pass";
var HOST				= "host";

// contact message const
var EMAIL				= "email";
var HANDLE			= "handle";

//email message const
var SUBJECT			= "subkect";
var MESSAGE			= "message";
var RECIPIENTS	= "recipients";

function input_validator(){
	this.debug = true;
};

input_validator.prototype.check_state = function(input) {
	var clean = {COMMAND : this.check_command(input.command), TIMESTAMP : validator.toFloat(input.timestamp)};
	this.log_data_cleaning(input, clean);
	return clean;
};

input_validator.prototype.check_callback = function(input) {3
	var clean = {ID : validator.toString(input.id), COMMAND : check_command(input.command)};
	this.log_data_cleaning(input, clean);
	return clean;
};

input_validator.prototype.check_command = function(input) {
	var command = validator.toString(input);

	if(validator.equals(command, "play")){
		return "play";
	}else if(validator.equals(command, "pause")){
		return "pause";
	} else if(validator.equals(command, "pause-sync")){
		return "pause-sync";
	} else {
		return "";
	}
};

input_validator.prototype.check_smtp = function(input) {
	var clean = {USER : validator.toString(input.user), PASS : validator.toString(input.pass), HOST : validator.toString(input.host)};
	this.log_data_cleaning(input, clean);
	return clean;
};

input_validator.prototype.check_contact = function(input) {
	var clean = {EMAIL : validator.normalizeEmail(input.email), HANDLE : validator.toString(input.handle)};
	this.log_data_cleaning(input, clean);
	return clean;
};

input_validator.prototype.check_email = function(input) {
	var recipients = new Map();

	for (var i in input.recipients){
		recipients.set(check_contact(input.recipients[i].email), check_contact(input.recipients[i].handle));
	}

	var clean = {SUBJECT : validator.toString(input.subject), MESSAGE : validator.toString(input.message), RECIPIENTS : recipients};
	this.log_data_cleaning(input, clean);
	return clean;
};

input_validator.prototype.check_user = function(input) {
};

input_validator.prototype.check_config = function(input) {
};

input_validator.prototype.log_data_cleaning = function(dirty_data, dirty_data){
	if(this.debug){
		console.log("dirty: ", dirty_data, "clean: ", dirty_data);
	}
}

module.exports = input_validator;
