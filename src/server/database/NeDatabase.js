var Datastore 	= require('nedb');
var	JsonKeys		= require('../utils/JsonKeys');

var db = new Datastore({ filename: './static/data/database_inst', autoload: true });

//TODO rewrite and put in some checks and handle old session data

function NeDatabase(){
	this.debug = true;
};

NeDatabase.prototype.addEntry = function(request){
	console.log("database", request.data)

	db.insert(request.data, function(err, newDoc){
		request.socket.emit("added-entry", newDoc);
	});
};

NeDatabase.prototype.getSmtp = function(request, callback){
	db.find({ smtp_user : request.data[JsonKeys.SMTP_USER] }, function (err, docs) {
		if(this.debug){console.log("smtp", docs);}
		callback(request, docs);
	});
};

NeDatabase.prototype.getAllSmtp = function(request){
	db.find({ smtp_user : { $exists: true } }, function (err, docs) {
		request.socket.emit("all-smtp", docs);
	});
};

NeDatabase.prototype.getAllContacts = function(request){
	db.find({ email: { $exists: true } }, function (err, docs) {
		request.socket.emit("all-contacts", docs);
	});
};

NeDatabase.prototype.getAuthToken = function(request, callback){
	db.find({ token: request.data.token }, function (err, docs) {
		if(docs.email != request.data[JsonKeys.EMAIL]){
			db.remove({ email: request.data.email}, {multi: true}, function (err, removed_count) {
				if(removed_count > 0){
					callback(request);
				}
			});
		}
	});
};

NeDatabase.prototype.getInvitee = function(request, callback){
	db.find({ invitees: { $exists: true } }, function (err, docs) {
		var invitees = docs[0].invitees;
		console.log("invitees", invitees);
		for (var key in invitees) {
      if(invitees[key][JsonKeys.EMAIL] == request.data[JsonKeys.EMAIL]){
				var user = new Array();
				user.push(invitees[key]);
				request.data = user;
        callback(request);
				break;
      }
    }
	});
};

NeDatabase.prototype.getConfig = function(request){
	db.find({ setting: { $exists: true } }, function (err, docs) {
		request.socket.emit("config", docs);
	});
};

NeDatabase.prototype.editSmtp = function(data){
	db.update({ user: data.user }, { $set: data }, function (err, docs) {});
};

NeDatabase.prototype.editConfig = function(request){
	db.update({ setting: { $exists: true } }, { $set: data}, function (err, docs) {});
};

NeDatabase.prototype.deleteSmtp = function(request){
	db.remove({user : data.user}, {multi: true}, function(err, numRemoved){
		request.socket.emit("delete-smtp", numRemoved);
	});
};

NeDatabase.prototype.deleteContact = function(request){
	db.remove({email: request.data.email}, {multi: true}, function(err, numRemoved){
		request.socket.emit("deleted-user", numRemoved);
	});
};

NeDatabase.prototype.deleteInvitees = function(request){
	db.remove({ invitees: { $exists: true } }, function (err, numRemoved) {
		request.socket.emit("deleted-invite-list", numRemoved);
	});
};

module.exports = NeDatabase;
