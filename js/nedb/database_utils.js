var Datastore 	= require('nedb');
var	json_keys		= require('../utils/json_keys');

var db = new Datastore({ filename: './database', autoload: true });

//TODO rewrite and put in some checks and handle old session data

function database_utils(){
	this.debug = true;
};

database_utils.prototype.add_entry = function(request){
	console.log("database", request.data)

	db.insert(request.data, function(err, newDoc){
		request.socket.emit("added-entry", newDoc);
	});
};

database_utils.prototype.get_smtp = function(request, callback){
	db.find({ smtp_user : request.data[json_keys.SMTP_USER] }, function (err, docs) {
		if(this.debug){console.log("smtp", docs);}
		callback(request, docs);
	});
};

database_utils.prototype.get_all_smtp = function(request){
	db.find({ smtp_user : { $exists: true } }, function (err, docs) {
		request.socket.emit("all-smtp", docs);
	});
};

database_utils.prototype.get_all_contacts = function(request){
	db.find({ email: { $exists: true } }, function (err, docs) {
		request.socket.emit("all-contacts", docs);
	});
};

database_utils.prototype.get_auth_token = function(request, callback){
	db.find({ token: request.data.token }, function (err, docs) {
		if(docs.email != request.data[json_keys.EMAIL]){
			db.remove({ email: request.data.email}, {multi: true}, function (err, removed_count) {
				if(removed_count > 0){
					callback(request);
				}
			});
		}
	});
};

database_utils.prototype.get_invitee = function(request, callback){
	db.find({ invitees: { $exists: true } }, function (err, docs) {
		var invitees = docs[0].invitees;
		console.log("invitees", invitees);
		for (var key in invitees) {
      if(invitees[key][json_keys.EMAIL] == request.data[json_keys.EMAIL]){
				var user = new Array();
				user.push(invitees[key]);
				request.data = user;
        callback(request);
				break;
      }
    }
	});
};

database_utils.prototype.get_config = function(request){
	db.find({ setting: { $exists: true } }, function (err, docs) {
		request.socket.emit("config", docs);
	});
};

database_utils.prototype.edit_smtp = function(data){
	db.update({ user: data.user }, { $set: data }, function (err, docs) {});
};

database_utils.prototype.edit_config = function(request){
	db.update({ setting: { $exists: true } }, { $set: data}, function (err, docs) {});
};

database_utils.prototype.delete_smtp = function(request){
	db.remove({user : data.user}, {multi: true}, function(err, numRemoved){
		request.socket.emit("delete-smtp", numRemoved);
	});
};

database_utils.prototype.delete_contact = function(request){
	db.remove({email: request.data.email}, {multi: true}, function(err, numRemoved){
		request.socket.emit("deleted-user", numRemoved);
	});
};

database_utils.prototype.delete_invitees = function(request){
	db.remove({ invitees: { $exists: true } }, function (err, numRemoved) {
		request.socket.emit("deleted-invite-list", numRemoved);
	});
};

module.exports = database_utils;
