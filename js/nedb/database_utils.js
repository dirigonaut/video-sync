var Datastore = require('nedb');
var db = new Datastore({ filename: './database', autoload: true });

function database_utils(){
	this.debug = true;
};

database_utils.prototype.add_entry = function(data){
	if(this.debug){
		console.log("database", data);
	}
	
	db.insert(data, function(err, newDoc){});
};

database_utils.prototype.get_smtp = function(callback){
	db.find({ primary: true }, function (err, docs) {
		if(this.debug){console.log("database", docs);}
		callback(docs);
	});
};

database_utils.prototype.get_all_smtp = function(socket){
	db.find({ user: { $exists: true } }, function (err, docs) {
		socket.emit("all-smtp", docs);
	});
};

database_utils.prototype.edit_smtp = function(data){
	db.update({ user: data.user }, { $set: data }, function (err, docs) {});
};

database_utils.prototype.change_priority = function(data){
	db.update({ primary: true }, { $set: { primary: false }}, function (err, docs) {
		db.update({ user: data.user }, { $set: { primary: true }}, function (err, docs) {});
	});
};

database_utils.prototype.delete_smtp = function(data){
	db.remove({user : data.user}, {multi: true}, function(err, numRemoved){});
};

database_utils.prototype.delete_contact = function(data){
	db.remove({email: data.email}, {multi: true}, function(err, numRemoved){});
};

database_utils.prototype.get_all_contacts = function(data){
	return db.find({ email: { $exists: true } }, function (err, docs) {});
};

database_utils.prototype.get_config = function(data){
	return db.find({ setting: { $exists: true } }, function (err, docs) {});
};

database_utils.prototype.update_config = function(data){
	db.update({ setting: { $exists: true } }, { $set: data}, function (err, docs) {});
};

module.exports = database_utils;
