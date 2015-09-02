var validator 		= require('validator');
var	json_keys			= require('./json_keys');

function input_validator(){
	this.debug = true;
};

input_validator.prototype.check_state = function(input) {
	var clean = {};

	clean[json_keys.COMMAND] 		= this.check_command(input[json_keys.COMMAND]);
	clean[json_keys.TIMESTAMP] 	= validator.toFloat(input[json_keys.TIMESTAMP]);

	this.log_data_cleaning(input, clean);
	return clean;
};

input_validator.prototype.check_callback = function(input) {
	var clean = {};

	clean[json_keys.ID] 			= validator.toString(input[json_keys.ID]);
	clean[json_keys.COMMAND] 	= this.check_command(input[json_keys.COMMAND]);

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
	var clean = {};

	clean[json_keys.SMTP_USER] = validator.toString(input[json_keys.SMTP_USER]);
	clean[json_keys.SMTP_PASS] = validator.toString(input[json_keys.SMTP_PASS]);
	clean[json_keys.SMTP_HOST] = validator.toString(input[json_keys.SMTP_HOST]);

	this.log_data_cleaning(input, clean);
	return clean;
};

input_validator.prototype.check_contact = function(input) {
	var clean = {};

	clean[json_keys.EMAIL] 	= input[json_keys.EMAIL]; //TODO normalizing takes out periods find new way
	clean[json_keys.HANDLE] = validator.toString(input[json_keys.HANDLE]);

	this.log_data_cleaning(input, clean);
	return clean;
};

input_validator.prototype.check_email = function(input) {
	var clean = {};
	var recipients = new Array();

	for (var key in input[json_keys.RECIPIENTS]){
		recipients[key] = (this.check_contact(input[json_keys.RECIPIENTS][key]));
	}

	clean[json_keys.SUBJECT] 		= validator.toString(input[json_keys.SUBJECT]);
	clean[json_keys.MESSAGE] 		= validator.toString(input[json_keys.MESSAGE]);
	clean[json_keys.RECIPIENTS] = recipients;

	this.log_data_cleaning(input, clean);
	return clean;
};

input_validator.prototype.check_user = function(input) {
	var clean = {};

	clean[json_keys.EMAIL] 	= input[json_keys.EMAIL]; //TODO normalizing takes out periods find new way
	clean[json_keys.TOKEN] 	= validator.toString(input[json_keys.TOKEN]);

	this.log_data_cleaning(input, clean);
	return clean;
};

input_validator.prototype.check_config = function(input) {
};

input_validator.prototype.log_data_cleaning = function(dirty_data, dirty_data){
	if(this.debug){
		console.log("dirty: ", dirty_data, "clean: ", dirty_data);
	}
};

input_validator.prototype.check_video_info = function(input){
	//TODO fill out logic for sterilizing data
	return input;
};


module.exports = input_validator;
