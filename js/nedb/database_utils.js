var Datastore = require('nedb');
var db = new Datastore({ filename: './database', autoload: true });

//TODO rewrite and put in some checks and handle old session data

function database_utils(){
	this.debug = true;
};

database_utils.prototype.add_entry = function(request){
	if(this.debug){console.log("database", request.data);}

	db.insert(request.data, function(err, newDoc){
		request.socket.emit("added-entry", docs);
	});
};

database_utils.prototype.get_smtp = function(request, callback){
	db.find({ user: request.data.user }, function (err, docs) {
		if(this.debug){console.log("database", docs);}
		callback(request, docs);
	});
};

database_utils.prototype.get_all_smtp = function(request){
	db.find({ user: { $exists: true } }, function (err, docs) {
		request.socket.emit("all-smtp", docs);
	});
};

database_utils.prototype.edit_smtp = function(data){
	db.update({ user: data.user }, { $set: data }, function (err, docs) {});
};

database_utils.prototype.delete_smtp = function(data){
	db.remove({user : data.user}, {multi: true}, function(err, numRemoved){
		request.socket.emit("delete-smtp", numRemoved);
	});
};

database_utils.prototype.delete_contact = function(request){
	db.remove({email: request.data.email}, {multi: true}, function(err, numRemoved){
		request.socket.emit("deleted-user", numRemoved);
	});
};

database_utils.prototype.get_all_contacts = function(request){
	db.find({ email: { $exists: true } }, function (err, docs) {
		request.socket.emit("all-contacts", docs);
	});
};

database_utils.prototype.get_config = function(request){
	db.find({ setting: { $exists: true } }, function (err, docs) {
		request.socket.emit("config", docs);
	});
};

database_utils.prototype.update_config = function(request){
	db.update({ setting: { $exists: true } }, { $set: data}, function (err, docs) {});
};

database_utils.prototype.get_invitee = function(user, callback){
	db.find({ invitees: { $exists: true } }, function (err, docs) {
		var invitees = docs[0].recipients;
		for (var i of invitees.keys()) {
      if(invitees.get(i) == user){
        callback(user);
				break;
      }
    }
	});
};

database_utils.prototype.delete_invitees = function(request){
	db.remove({ invitees: { $exists: true } }, function (err, numRemoved) {
		request.socket.emit("deleted-invite-list", numRemoved);
	});
};

database_utils.prototype.get_auth_token = function(token, callback){
	db.find({ token: token }, function (err, docs) {
		if(docs.user != null){
			db.remove({ token: token }, function (err, docs) {});
			callback(docs.socket);
		}
	});
};

module.exports = database_utils;
